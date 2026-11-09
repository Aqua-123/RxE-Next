import { createElement, Fragment, type ReactNode } from "react";
import { Pipeline, type Scope } from "@/core/scope";
import { injectStyle } from "@/platform/dom";
import { attempt } from "@/platform/log";
import { type SiteReact, siteReact } from "@/platform/modules";
import { exposeSurface, type Patch, registerPatches } from "@/platform/webpack";
import { type MountedRoot, mountRoot } from "@/ui/mount";
import { onGenderLearned, rememberedGender } from "../genders";
import type { RoomId, User, UserId } from "../model";
import { parseUser } from "../wire";

/**
 * Classes the patched Avatar component always carries, so features can style avatars
 * from a stylesheet (and toggle live) without the site re-rendering anything.
 */
export const AVATAR_CLASSES = {
  root: "rxe-avatar",
  gender: (gender: User["gender"]) => `rxe-gender-${gender}`,
  mod: "rxe-mod",
  gold: "rxe-gold",
  /** Lets an avatar rendered before its user's gender was known pick it up later. */
  user: (id: UserId) => `rxe-user-${id}`,
} as const;

const GENDER_CLASS = /\brxe-gender-\w+/;

function genderOf(user: User): User["gender"] {
  return user.gender === "unknown" ? (rememberedGender(user.id) ?? "unknown") : user.gender;
}

/** One rendered chat message row in group chat. */
const MESSAGE_ROW = '[class*="room_global_textContainer__"]';
/** The text of one message line, in every chat. */
const MESSAGE_TEXT = '[class*="_textContent__"]';

const FLASH_CLASS = "rxe-flash";

const PATCHES: Patch[] = [
  {
    // Group chat, DMs and text chat: each text cell is `{id:"msg"+user.id…, children:[TEXT, …]}`.
    find: 'id:"msg".concat(',
    all: true,
    replace: {
      match: /(id:"msg"\.concat\(\(?null==(\i)\?void 0:[^}]*?\),children:\[)(\i(?:\.msg)?),/g,
      with: "$1$rxe.messages.text($3,$2),",
    },
  },
  {
    // Video chat sidebar: the message group is shadowed here, so there is no author.
    find: '"msg ".concat(',
    replace: {
      match: /(className:"".concat\(\i\(\)\.textContent\),children:\[)(\i)\.msg,/,
      with: "$1$rxe.messages.text($2.msg,null),",
    },
  },
  {
    // The shared Avatar component: tag every avatar with its user's classes.
    find: '"Avatar.jsx"',
    replace: {
      match: /("avatar-"\.concat\(\i\),"avatar",)(\i&&\(null==(\i)\?void 0:\3\.online\))/,
      with: "$1$rxe.messages.avatarClass($3),$2",
    },
  },
  {
    // Group chat, DMs and text/video chat render the sender as `<span className=username>{name}{badges}</span>`.
    find: /\.username\),children:\[null==/,
    all: true,
    replace: {
      match:
        /(className:"".concat\(\i\(\)\.username\),children:\[null==(\i)\?void 0:null===\(\i=\2\.user\)\|\|void 0===\i\?void 0:\i\.display_name,)/g,
      with: "$1$rxe.messages.groupTime($2),",
    },
  },
  {
    // Group chat's list is `<ul>{groups?.map(group => <li/>)}<div ref={bottom}/></ul>`;
    // wrap the mapped rows so a passing line can follow them.
    find: '"GroupChatView"',
    replace: [
      {
        match:
          /(\(0,\i\.jsxs\)\("ul",\{ref:\i,className:"".concat\(\i\(\)\.chatTextsList\),children:\[)(null==(\i)\?void 0:\3\.map\()/,
        with: "$1$rxe.messages.withFlash($3,$2",
      },
      {
        match:
          /(\),\(0,\i\.jsx\)\("div",\{ref:\i\}\)\]\}\)\]\}\),\(0,\i\.jsxs\)\("div",\{className:\i\(\)\.sendTextForm)/,
        with: ")$1",
      },
    ],
  },
];

/** Group chat subscribes to `RoomChannel` with `room_id: "channel" + ?id`. */
function currentGroupRoom(): RoomId | null {
  const id = new URLSearchParams(location.search).get("id");
  return id ? (`channel${id}` as RoomId) : null;
}

export interface RenderedMessage {
  /** After rewrites (e.g. disguised links revealed). */
  text: string;
  /** Exactly as the site has it, which is what was sent. */
  raw: string;
  /** Null where the site doesn't have the author at hand (video chat sidebar). */
  author: User | null;
}

/** Returns the message's replacement content, or null to leave it as plain text. */
export type TextRenderer = (text: string, message: RenderedMessage) => ReactNode | null;

/**
 * Content shown after a message's text, or null for none. Return false to keep a slot
 * that may fill in later (after `refresh()`): plain messages otherwise stay plain text.
 */
export type Annotator = (message: RenderedMessage) => ReactNode | false | null;

export interface MessagesApi {
  /** Renderers run in feature order; the first that returns content wins. */
  renderText(renderer: TextRenderer): void;
  /**
   * Changes a message's text before renderers see it and the site shows it, e.g. to
   * undo an encoding. Covers history too, as it renders.
   */
  rewriteText(rewrite: (text: string) => string | undefined): void;
  /** Adds content after message text, such as a delivery status. Annotators run in feature order. */
  annotate(annotator: Annotator): void;
  /** Renders something next to each sender's name in every chat, given when they wrote. */
  renderGroupTime(render: (time: Date) => ReactNode): void;
  /** Re-renders every message with the current renderers (e.g. after a setting changed). */
  refresh(): void;
  /** Hides already-rendered messages by these authors. Replaces this feature's previous set. */
  hideAuthors(ids: Iterable<UserId>): void;
  /**
   * Hides group chat messages, including history, by authors matching `predicate`.
   * Replaces this feature's previous predicate.
   */
  hideAuthorsWhere(predicate: (author: User) => boolean): void;
  /** Keeps line breaks in message text, which the site collapses into spaces. */
  showLineBreaks(): void;
  /**
   * Shows one passing line under group chat's last message, if `room` is on screen,
   * like the old RxE's status line: the next one replaces it, and it goes after `ms`.
   */
  flash(room: RoomId, content: ReactNode, ms?: number): void;
}

const renderers = new Pipeline<TextRenderer>();
const annotators = new Pipeline<Annotator>();
const timeRenderers = new Pipeline<(time: Date) => ReactNode>();
const rewrites = new Pipeline<(text: string) => string | undefined>();

function rewriteText(text: string): string {
  let value = text;
  for (const rewrite of rewrites) {
    const result = attempt("text rewrite", () => rewrite(value));
    if (typeof result === "string") value = result;
  }
  return value;
}
let renderersVersion = 0;
const renderersListeners = new Set<() => void>();

function renderersChanged(): void {
  renderersVersion += 1;
  for (const listener of renderersListeners) listener();
}

const parsedUsers = new WeakMap<object, User | null>();
/** Every author the site has rendered, so a new hide predicate also covers messages on screen. */
const seenAuthors = new Map<UserId, User>();
const hidePredicates = new Map<Scope, (author: User) => boolean>();
const hiddenWhere = new Set<UserId>();

function authorOf(group: unknown): User | null {
  const raw = (group as { user?: unknown } | null)?.user;
  if (!raw || typeof raw !== "object") return null;
  if (!parsedUsers.has(raw)) {
    const user = parseUser(raw);
    parsedUsers.set(raw, user);
    if (user) {
      seenAuthors.set(user.id, user);
      if (!hiddenWhere.has(user.id) && matchesHidePredicate(user)) {
        hiddenWhere.add(user.id);
        renderHidden();
      }
    }
  }
  return parsedUsers.get(raw) ?? null;
}

function matchesHidePredicate(user: User): boolean {
  for (const predicate of hidePredicates.values()) {
    if (attempt("hide predicate", () => predicate(user))) return true;
  }
  return false;
}

function renderMessageText(message: RenderedMessage): ReactNode {
  for (const renderer of renderers) {
    const node = attempt("message renderer", () => renderer(message.text, message));
    if (node != null) return node;
  }
  return message.text;
}

function annotationsFor(message: RenderedMessage): Array<ReactNode | false> {
  const annotations: Array<ReactNode | false> = [];
  for (const annotator of annotators) {
    const annotation = attempt("message annotator", () => annotator(message));
    if (annotation !== null && annotation !== undefined) annotations.push(annotation);
  }
  return annotations;
}

function renderMessage(message: RenderedMessage): ReactNode {
  const annotations = annotationsFor(message);
  const content = renderMessageText(message);
  return annotations.length ? createElement(Fragment, null, content, ...annotations) : content;
}

function subscribeRenderers(listener: () => void): () => void {
  renderersListeners.add(listener);
  return () => {
    renderersListeners.delete(listener);
  };
}

/**
 * Rendered by the site's React in place of a message's text. It hosts an RxE React
 * root (in a shadow root) and re-renders when features register or unregister, so
 * turning a renderer off restores plain text immediately.
 */
function createTextHost(react: SiteReact) {
  const getVersion = () => renderersVersion;

  // biome-ignore lint/correctness/noComponentHookFactories: built against the site's React instance, which only exists at runtime.
  return function RxeMessageText({ text, raw, author }: RenderedMessage) {
    const host = react.useRef<HTMLElement>(null);
    const root = react.useRef<MountedRoot | null>(null);
    const version = react.useSyncExternalStore(subscribeRenderers, getVersion);

    react.useLayoutEffect(() => {
      root.current = mountRoot(host.current!, "append");
      return () => {
        root.current?.unmount();
        root.current = null;
      };
    }, []);
    // `version` re-runs the renderers when features register or unregister.
    react.useLayoutEffect(() => {
      root.current?.render(renderMessage({ text, raw, author }));
    }, [text, raw, author, version]);

    return react.createElement("rxe-text", { ref: host });
  };
}

interface Flash {
  key: string;
  owner: Scope;
  room: RoomId;
  content: ReactNode;
}

let flash: Flash | null = null;
let flashCount = 0;
let flashTimer: ReturnType<typeof setTimeout> | undefined;
const flashListeners = new Set<() => void>();

function setFlash(next: Flash | null): void {
  flash = next;
  for (const listener of flashListeners) listener();
}

function subscribeFlash(listener: () => void): () => void {
  flashListeners.add(listener);
  return () => {
    flashListeners.delete(listener);
  };
}

/** The site's `<li>` for the passing line, with RxE content in a shadow root. */
function createFlashItem(react: SiteReact) {
  // biome-ignore lint/correctness/noComponentHookFactories: built against the site's React instance, which only exists at runtime.
  return function RxeFlash({ content }: { content: ReactNode }) {
    const item = react.useRef<HTMLLIElement>(null);
    const root = react.useRef<MountedRoot | null>(null);

    react.useLayoutEffect(() => {
      const element = item.current!;
      root.current = mountRoot(element, "append");
      // Keep following the conversation if the reader was at the bottom.
      const list = element.parentElement;
      if (list) {
        const fromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
        if (fromBottom <= element.offsetHeight + 80) list.scrollTop = list.scrollHeight;
      }
      return () => {
        root.current?.unmount();
        root.current = null;
      };
    }, []);
    react.useLayoutEffect(() => {
      root.current?.render(content);
    }, [content]);

    return react.createElement("li", { ref: item, className: FLASH_CLASS });
  };
}

function createMessageList(react: SiteReact) {
  const FlashItem = createFlashItem(react);
  const getFlash = () => flash;

  // biome-ignore lint/correctness/noComponentHookFactories: built against the site's React instance, which only exists at runtime.
  return function RxeMessageList({ rows }: { rows: readonly ReactNode[] }) {
    const current = react.useSyncExternalStore(subscribeFlash, getFlash);
    if (!current || current.room !== currentGroupRoom()) return rows;
    return [
      ...rows,
      react.createElement(FlashItem, { key: current.key, content: current.content }),
    ];
  };
}

let textHost: ReturnType<typeof createTextHost> | undefined;
let timeHost: ReturnType<typeof createTimeHost> | undefined;

/** History has a UTC `timestamp` (no zone, nanoseconds); text chat lines a `timestamp` in ms. */
function parseTime(value: unknown): Date | null {
  if (typeof value === "number") return new Date(value);
  if (typeof value !== "string" || !value) return null;
  // `2026-11-09T14:44:26.751387383`: Date only reads up to milliseconds.
  const trimmed = value.replace(/(\.\d{3})\d+/, "$1");
  const time = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(trimmed) ? trimmed : `${trimmed}Z`);
  return Number.isNaN(time.getTime()) ? null : time;
}

/**
 * Live messages carry no time, and the site rebuilds a group's object whenever a line
 * is merged in, so they are dated by when RxE first saw the group's first line.
 */
const firstSeen = new Map<string, number>();

function groupTimeOf(group: unknown): Date | null {
  const value = group as {
    timestamp?: unknown;
    messages?: unknown[];
    user?: { id?: unknown };
  } | null;
  if (!value || typeof value !== "object") return null;
  const first = value.messages?.[0];
  const stamped =
    parseTime(value.timestamp) ??
    parseTime(
      first && typeof first === "object" ? (first as { timestamp?: unknown }).timestamp : null
    );
  if (stamped) return stamped;
  const firstText =
    typeof first === "string" ? first : (first as { msg?: unknown } | undefined)?.msg;
  const key = `${String(value.user?.id)}:${String(firstText)}`;
  if (!firstSeen.has(key)) {
    if (firstSeen.size > 2000) firstSeen.clear();
    firstSeen.set(key, Date.now());
  }
  return new Date(firstSeen.get(key)!);
}

function createTimeHost(react: SiteReact) {
  const getVersion = () => renderersVersion;
  // biome-ignore lint/correctness/noComponentHookFactories: built against the site's React instance, which only exists at runtime.
  return function RxeGroupTime({ time }: { time: number }) {
    const host = react.useRef<HTMLElement>(null);
    const root = react.useRef<MountedRoot | null>(null);
    const version = react.useSyncExternalStore(subscribeRenderers, getVersion);
    react.useLayoutEffect(() => {
      root.current = mountRoot(host.current!, "append");
      return () => {
        root.current?.unmount();
        root.current = null;
      };
    }, []);
    // biome-ignore lint/correctness/useExhaustiveDependencies: `version` changes when renderers do.
    react.useLayoutEffect(() => {
      const [render] = timeRenderers;
      root.current?.render(render ? attempt("group time", () => render(new Date(time))) : null);
    }, [time, version]);
    return react.createElement("rxe-text", { ref: host });
  };
}
let messageList: ReturnType<typeof createMessageList> | undefined;

/** Called from the patched site code. Must never throw. */
const hooks = {
  text(value: unknown, group: unknown): unknown {
    if (typeof value !== "string") return value;
    const author = authorOf(group);
    const text = rewriteText(value);
    if (renderers.size === 0 && annotators.size === 0) return text;
    const message = { text, raw: value, author };
    // Plain messages stay plain text nodes; only messages a feature changes get an RxE root.
    if (renderMessageText(message) === text && annotationsFor(message).length === 0) return text;
    const react = siteReact();
    if (!react) return text;
    textHost ??= createTextHost(react);
    return react.createElement(textHost, message);
  },
  groupTime(group: unknown): unknown {
    if (timeRenderers.size === 0) return null;
    const time = groupTimeOf(group);
    const react = siteReact();
    if (!time || !react) return null;
    timeHost ??= createTimeHost(react);
    return react.createElement(timeHost, { time: time.getTime() });
  },
  avatarClass(raw: unknown): string {
    const user = raw && typeof raw === "object" ? parseUser(raw) : null;
    if (!user) return AVATAR_CLASSES.root;
    return [
      AVATAR_CLASSES.root,
      AVATAR_CLASSES.user(user.id),
      AVATAR_CLASSES.gender(genderOf(user)),
      user.isMod && AVATAR_CLASSES.mod,
      user.isGold && AVATAR_CLASSES.gold,
    ]
      .filter(Boolean)
      .join(" ");
  },
  /** Always wraps, so the first passing line doesn't remount every row. */
  withFlash(groups: unknown, rows: unknown): unknown {
    if (!Array.isArray(groups) || !Array.isArray(rows)) return rows;
    const react = siteReact();
    if (!react) return rows;
    messageList ??= createMessageList(react);
    return react.createElement(messageList, { rows: rows as ReactNode[] });
  },
};

/** Registers the surface's patches. Called synchronously at boot, before chunks load. */
export function installMessagesSurface(): void {
  // The site re-renders with the remembered gender next time; until then, swap the class.
  onGenderLearned((id, gender) => {
    for (const avatar of document.getElementsByClassName(AVATAR_CLASSES.user(id))) {
      avatar.className = avatar.className.replace(GENDER_CLASS, AVATAR_CLASSES.gender(gender));
    }
  });
  registerPatches("surface:messages", PATCHES);
  exposeSurface("messages", hooks);
  injectStyle("messages-flash", `.${FLASH_CLASS}{list-style:none}`);
}

const hiddenByScope = new Map<Scope, ReadonlySet<UserId>>();

function renderHidden(): void {
  const ids = new Set([...hiddenByScope.values()].flatMap((set) => [...set]));
  for (const id of hiddenWhere) ids.add(id);
  const selectors = [...ids].map((id) => `${MESSAGE_ROW}[data-user-id="${id}"]`);
  injectStyle(
    "messages-hidden",
    selectors.length ? `${selectors.join(",")}{display:none!important}` : ""
  );
}

function recomputeHiddenWhere(): void {
  hiddenWhere.clear();
  for (const user of seenAuthors.values()) {
    if (matchesHidePredicate(user)) hiddenWhere.add(user.id);
  }
  renderHidden();
}

export function scopedMessages(scope: Scope): MessagesApi {
  scope.add(() => {
    const hadIds = hiddenByScope.delete(scope);
    const hadPredicate = hidePredicates.delete(scope);
    if (hadPredicate) recomputeHiddenWhere();
    else if (hadIds) renderHidden();
    if (flash?.owner === scope) {
      clearTimeout(flashTimer);
      setFlash(null);
    }
  });
  return {
    renderText(renderer) {
      const remove = renderers.add(scope, renderer);
      renderersChanged();
      scope.add(() => {
        remove();
        renderersChanged();
      });
    },
    rewriteText(rewrite) {
      const remove = rewrites.add(scope, rewrite);
      renderersChanged();
      scope.add(() => {
        remove();
        renderersChanged();
      });
    },
    annotate(annotator) {
      const remove = annotators.add(scope, annotator);
      renderersChanged();
      scope.add(() => {
        remove();
        renderersChanged();
      });
    },
    renderGroupTime(render) {
      const remove = timeRenderers.add(scope, render);
      renderersChanged();
      scope.add(() => {
        remove();
        renderersChanged();
      });
    },
    refresh: renderersChanged,
    hideAuthors(ids) {
      hiddenByScope.set(scope, new Set(ids));
      renderHidden();
    },
    showLineBreaks() {
      scope.add(injectStyle(`line-breaks:${scope.owner}`, `${MESSAGE_TEXT}{white-space:pre-line}`));
    },
    hideAuthorsWhere(predicate) {
      hidePredicates.set(scope, predicate);
      recomputeHiddenWhere();
    },
    flash(room, content, ms = 5000) {
      // Group chat only listens to the room on screen; anything else has nowhere to go.
      if (room !== currentGroupRoom()) return;
      flashCount += 1;
      clearTimeout(flashTimer);
      const shown: Flash = { key: `rxe-flash-${flashCount}`, owner: scope, room, content };
      setFlash(shown);
      flashTimer = setTimeout(() => {
        if (flash === shown) setFlash(null);
      }, ms);
    },
  };
}
