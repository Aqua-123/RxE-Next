import type { ReactNode } from "react";
import type { Scope } from "@/core/scope";
import { injectStyle } from "@/platform/dom";
import { attempt } from "@/platform/log";
import { type SiteReact, siteReact } from "@/platform/modules";
import { exposeSurface, type Patch, registerPatches } from "@/platform/webpack";
import { type MountedRoot, mountRoot } from "@/ui/mount";
import type { User, UserId } from "../model";
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
} as const;

/** One rendered chat message row in group chat. */
const MESSAGE_ROW = '[class*="room_global_textContainer__"]';

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
];

export interface RenderedMessage {
  text: string;
  /** Null where the site doesn't have the author at hand (video chat sidebar). */
  author: User | null;
}

/** Returns the message's replacement content, or null to leave it as plain text. */
export type TextRenderer = (text: string, message: RenderedMessage) => ReactNode | null;

export interface MessagesApi {
  renderText(renderer: TextRenderer): void;
  /** Re-renders every message with the current renderers (e.g. after a setting changed). */
  refresh(): void;
  /** Hides already-rendered messages by these authors. Replaces this feature's previous set. */
  hideAuthors(ids: Iterable<UserId>): void;
}

const renderers = new Set<TextRenderer>();
let renderersVersion = 0;
const renderersListeners = new Set<() => void>();

function renderersChanged(): void {
  renderersVersion += 1;
  for (const listener of renderersListeners) listener();
}

const parsedUsers = new WeakMap<object, User | null>();

function authorOf(group: unknown): User | null {
  const raw = (group as { user?: unknown } | null)?.user;
  if (!raw || typeof raw !== "object") return null;
  if (!parsedUsers.has(raw)) parsedUsers.set(raw, parseUser(raw));
  return parsedUsers.get(raw) ?? null;
}

function renderMessageText(message: RenderedMessage): ReactNode {
  for (const renderer of renderers) {
    const node = attempt("message renderer", () => renderer(message.text, message));
    if (node != null) return node;
  }
  return message.text;
}

/**
 * Rendered by the site's React in place of a message's text. It hosts an RxE React
 * root (in a shadow root) and re-renders when features register or unregister, so
 * turning a renderer off restores plain text immediately.
 */
function createTextHost(react: SiteReact) {
  const subscribe = (listener: () => void) => {
    renderersListeners.add(listener);
    return () => {
      renderersListeners.delete(listener);
    };
  };
  const getVersion = () => renderersVersion;

  // biome-ignore lint/correctness/noComponentHookFactories: built against the site's React instance, which only exists at runtime.
  return function RxeMessageText({ text, author }: RenderedMessage) {
    const host = react.useRef<HTMLElement>(null);
    const root = react.useRef<MountedRoot | null>(null);
    const version = react.useSyncExternalStore(subscribe, getVersion);

    react.useLayoutEffect(() => {
      root.current = mountRoot(host.current!, "append");
      return () => {
        root.current?.unmount();
        root.current = null;
      };
    }, []);
    // `version` re-runs the renderers when features register or unregister.
    react.useLayoutEffect(() => {
      root.current?.render(renderMessageText({ text, author }));
    }, [text, author, version]);

    return react.createElement("rxe-text", { ref: host });
  };
}

let textHost: ReturnType<typeof createTextHost> | undefined;

/** Called from the patched site code. Must never throw. */
const hooks = {
  text(value: unknown, group: unknown): unknown {
    if (typeof value !== "string" || renderers.size === 0) return value;
    const react = siteReact();
    if (!react) return value;
    textHost ??= createTextHost(react);
    return react.createElement(textHost, { text: value, author: authorOf(group) });
  },
  avatarClass(raw: unknown): string {
    const user = raw && typeof raw === "object" ? parseUser(raw) : null;
    if (!user) return AVATAR_CLASSES.root;
    return [
      AVATAR_CLASSES.root,
      AVATAR_CLASSES.gender(user.gender),
      user.isMod && AVATAR_CLASSES.mod,
      user.isGold && AVATAR_CLASSES.gold,
    ]
      .filter(Boolean)
      .join(" ");
  },
};

/** Registers the surface's patches. Called synchronously at boot, before chunks load. */
export function installMessagesSurface(): void {
  registerPatches("surface:messages", PATCHES);
  exposeSurface("messages", hooks);
}

const hiddenByScope = new Map<Scope, ReadonlySet<UserId>>();

function renderHidden(): void {
  const ids = new Set([...hiddenByScope.values()].flatMap((set) => [...set]));
  const selectors = [...ids].map((id) => `${MESSAGE_ROW}[data-user-id="${id}"]`);
  injectStyle(
    "messages-hidden",
    selectors.length ? `${selectors.join(",")}{display:none!important}` : ""
  );
}

export function scopedMessages(scope: Scope): MessagesApi {
  scope.add(() => {
    if (hiddenByScope.delete(scope)) renderHidden();
  });
  return {
    renderText(renderer) {
      renderers.add(renderer);
      renderersChanged();
      scope.add(() => {
        renderers.delete(renderer);
        renderersChanged();
      });
    },
    refresh: renderersChanged,
    hideAuthors(ids) {
      hiddenByScope.set(scope, new Set(ids));
      renderHidden();
    },
  };
}
