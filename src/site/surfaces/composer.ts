import type { ReactNode } from "react";
import { Pipeline, type Scope } from "@/core/scope";
import { injectStyle, watch } from "@/platform/dom";
import { attempt } from "@/platform/log";
import { exposeSurface, type Patch, registerPatches } from "@/platform/webpack";
import { mount } from "@/ui/mount";

/**
 * Every chat box (group chat, DMs, text, video and wing chat) is an uncontrolled
 * `<input id="msg-input">` whose `onKeyPress` reads `target.value` on Enter, sends
 * it, and appends it to the local message list. Rewriting the value in a capturing
 * listener, which runs before React's root listener, changes both what is sent and
 * what you see.
 */
const INPUT_ID = "msg-input";
const INPUT = `#${INPUT_ID}`;
/** Where a dropped file counts as meant for the chat: the message list and the box under it. */
const DROP_AREA = '[class*="_chatTextsListContainer__"], [class*="_sendTextForm__"]';
/** The site's own image upload (Gold only), next to the box in DMs, text and video chat. */
const SITE_UPLOAD = "#file-upload";
/** Lines a multi-line box grows to before it scrolls. */
const MAX_ROWS = 6;

const PATCHES: Patch[] = [
  {
    // Every chat box renders `jsx("input",{maxLength:800,id:"msg-input",…})`; let RxE pick the tag.
    find: 'id:"msg-input"',
    all: true,
    replace: {
      match: /\("input",(\{maxLength:800,id:"msg-input",)/,
      with: "($rxe.composer.tag(),$1rows:1,",
    },
  },
];

/**
 * The site styles its boxes as `…inputControls>input`; a textarea needs the same
 * look, plus room to grow.
 */
const TEXTAREA_CSS = `
textarea${INPUT}{display:block;width:100%;border:none;resize:none;font:inherit;line-height:1.4;
  background-color:var(--base1-450);color:var(--primary-content);padding:11px 12px;
  field-sizing:content;max-height:calc(${MAX_ROWS} * 1.4em + 24px);overflow-y:auto}
[class*="chat-view_inputControls__"]>textarea${INPUT}{padding-right:45px}
@media(min-width:992px){
  textarea${INPUT}{border-radius:11px;padding:12px}
  [class*="chat-view_inputControls__"]>textarea${INPUT}{border-radius:10px 0 0 10px;padding-right:45px}
}`;

type Box = HTMLInputElement | HTMLTextAreaElement;

function asBox(target: EventTarget | null): Box | null {
  return (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
    target.id === INPUT_ID
    ? target
    : null;
}

/** A key pressed in a chat box; return true to take it from the site. */
export type KeyHandler = (key: {
  key: string;
  text: string;
  setText(text: string): void;
}) => boolean | undefined;

/** Returns the replacement text (empty sends nothing), or undefined to leave it unchanged. */
export type ComposerTransform = (text: string) => string | undefined;

export interface ComposerApi {
  /** Rewrites what you type in any chat box when you press Enter, before the site sends it. */
  transform(handler: ComposerTransform): void;
  /** Renders a control right after every chat box. */
  addButton(render: () => ReactNode): void;
  /** Receives images pasted into a chat box or dropped onto a chat. */
  onFiles(handler: (files: File[]) => void): void;
  /** Sends `text` from the chat box on screen, exactly as if you typed it and pressed Enter. */
  send(text: string): boolean;
  /** Puts `text` in the chat box on screen, ready to edit and send. */
  draft(text: string): boolean;
  /** Whether this chat has the site's own image upload (Gold only; not in group chat). */
  hasSiteUpload(): boolean;
  /** Hands a file to the site's own image upload, if this chat has one. */
  sendWithSiteUpload(file: File): boolean;
  /**
   * Makes every chat box multi-line while registered: Shift+Enter adds a line, Enter
   * sends. Boxes switch when the site next renders them.
   */
  multiline(): void;
  /** Sees what you typed (before transforms) each time you send from a chat box. */
  onSent(listener: (typed: string) => void): void;
  /** Sees keys pressed in a chat box before the site does. */
  onKeyDown(handler: KeyHandler): void;
}

const transforms = new Pipeline<ComposerTransform>();
const fileHandlers = new Pipeline<(files: File[]) => void>();
const sentListeners = new Pipeline<(typed: string) => void>();
const keyHandlers = new Pipeline<KeyHandler>();
const multilineScopes = new Set<Scope>();
/** Set while RxE itself sends (e.g. an image link), which isn't something you typed. */
let sendingForFeature = false;

export function applyTransforms(text: string): string {
  let value = text;
  for (const transform of transforms) {
    const result = attempt("composer transform", () => transform(value));
    if (typeof result === "string") value = result;
  }
  return value;
}

function fitRows(box: Box): void {
  // Grows the box where CSS `field-sizing` isn't supported.
  if (box instanceof HTMLTextAreaElement) {
    box.rows = Math.min(MAX_ROWS, box.value.split("\n").length);
  }
}

function onKeyPress(event: KeyboardEvent): void {
  const box = asBox(event.target);
  if (!box || event.key !== "Enter") return;
  if (box instanceof HTMLTextAreaElement) {
    // Shift+Enter: keep it from the site, so the textarea just gets a new line.
    if (event.shiftKey) {
      event.stopPropagation();
      return;
    }
    // Enter: the site sends; never also insert a line break.
    event.preventDefault();
  }
  const typed = box.value.trim();
  if (!typed) return;
  const next = applyTransforms(typed);
  if (next !== typed) box.value = next;
  if (!sendingForFeature) {
    for (const listener of sentListeners) attempt("composer sent", () => listener(typed));
  }
  queueMicrotask(() => fitRows(box));
}

function onKeyDown(event: KeyboardEvent): void {
  const box = asBox(event.target);
  if (!box || keyHandlers.size === 0) return;
  for (const handler of keyHandlers) {
    const taken = attempt("composer key", () =>
      handler({
        key: event.key,
        text: box.value,
        setText(text) {
          box.value = text;
          box.setSelectionRange(text.length, text.length);
          fitRows(box);
        },
      })
    );
    if (taken) {
      event.preventDefault();
      return;
    }
  }
}

function onInput(event: Event): void {
  const box = asBox(event.target);
  if (box) fitRows(box);
}

const imagesIn = (list: FileList | null | undefined) =>
  [...(list ?? [])].filter((file) => file.type.startsWith("image/"));

function handFiles(event: Event, files: File[]): void {
  if (files.length === 0 || fileHandlers.size === 0) return;
  event.preventDefault();
  for (const handler of fileHandlers) attempt("composer files", () => handler(files));
}

function onPaste(event: ClipboardEvent): void {
  if ((event.target as Element | null)?.id !== INPUT_ID) return;
  handFiles(event, imagesIn(event.clipboardData?.files));
}

function inDropArea(event: DragEvent): boolean {
  return fileHandlers.size > 0 && Boolean((event.target as Element | null)?.closest?.(DROP_AREA));
}

function onDragOver(event: DragEvent): void {
  if (inDropArea(event) && event.dataTransfer?.types.includes("Files")) event.preventDefault();
}

function onDrop(event: DragEvent): void {
  if (inDropArea(event)) handFiles(event, imagesIn(event.dataTransfer?.files));
}

/** The box you're looking at: the focused one, else the first on the page. */
function currentInput(): Box | null {
  return asBox(document.activeElement) ?? asBox(document.querySelector(INPUT));
}

export function sendText(text: string): boolean {
  const input = currentInput();
  if (!input || input.disabled) return false;
  const draft = input.value;
  input.value = text;
  sendingForFeature = true;
  // React only dispatches keypress events that carry a char code.
  input.dispatchEvent(
    new KeyboardEvent("keypress", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      charCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    })
  );
  sendingForFeature = false;
  // The site clears the box when it sends; put back whatever was being typed.
  const sent = input.value === "";
  input.value = draft;
  return sent;
}

function siteUpload(): HTMLInputElement | null {
  const upload = document.querySelector<HTMLInputElement>(SITE_UPLOAD);
  return upload && !upload.disabled ? upload : null;
}

function sendWithSiteUpload(file: File): boolean {
  const upload = siteUpload();
  if (!upload) return false;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  upload.files = transfer.files;
  upload.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

/** Called from the patched chat boxes. Must never throw. */
const hooks = {
  tag: (): string => (multilineScopes.size > 0 ? "textarea" : "input"),
};

/** Called once at boot; capturing on window runs before React's handlers on the root. */
export function installComposerSurface(): void {
  registerPatches("surface:composer", PATCHES);
  exposeSurface("composer", hooks);
  injectStyle("composer-textarea", TEXTAREA_CSS);
  addEventListener("keypress", onKeyPress, { capture: true });
  addEventListener("keydown", onKeyDown, { capture: true });
  addEventListener("input", onInput, { capture: true });
  addEventListener("paste", onPaste, { capture: true });
  addEventListener("dragover", onDragOver, { capture: true });
  addEventListener("drop", onDrop, { capture: true });
}

export function scopedComposer(scope: Scope): ComposerApi {
  return {
    transform: (handler) => scope.add(transforms.add(scope, handler)),
    addButton(render) {
      scope.add(watch(INPUT, (input) => mount(render(), input, "after")));
    },
    onFiles: (handler) => scope.add(fileHandlers.add(scope, handler)),
    send: sendText,
    draft(text) {
      const box = currentInput();
      if (!box || box.disabled) return false;
      box.value = text;
      box.focus();
      box.setSelectionRange(text.length, text.length);
      fitRows(box);
      return true;
    },
    hasSiteUpload: () => siteUpload() !== null,
    sendWithSiteUpload,
    multiline() {
      multilineScopes.add(scope);
      scope.add(() => multilineScopes.delete(scope));
    },
    onSent: (listener) => scope.add(sentListeners.add(scope, listener)),
    onKeyDown: (handler) => scope.add(keyHandlers.add(scope, handler)),
  };
}
