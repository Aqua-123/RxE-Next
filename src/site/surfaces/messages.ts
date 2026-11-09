import type { ReactNode } from "react";
import { Pipeline, type Scope } from "@/core/scope";
import { injectStyle } from "@/platform/dom";
import { attempt } from "@/platform/log";
import { type SiteReact, siteReact } from "@/platform/modules";
import { exposeSurface, type Patch, registerPatches } from "@/platform/webpack";
import { type MountedRoot, mountRoot } from "@/ui/mount";
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
} as const;

/** One rendered chat message row in group chat. */
const MESSAGE_ROW = '[class*="room_global_textContainer__"]';
/** The text of one message line, in every chat. */
const MESSAGE_TEXT = '[class*="_textContent__"]';

const NOTICE_CLASS = "rxe-notice";

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
    // Group chat's list is `<ul>{groups?.map(group => <li/>)}<div ref={bottom}/></ul>`;
    // wrap the mapped rows so notices can sit between them.
    find: '"GroupChatView"',
    replace: [
      {
        match:
          /(\(0,\i\.jsxs\)\("ul",\{ref:\i,className:"".concat\(\i\(\)\.chatTextsList\),children:\[)(null==(\i)\?void 0:\3\.map\()/,
        with: "$1$rxe.messages.withNotices($3,$2",
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
  text: string;
  /** Null where the site doesn't have the author at hand (video chat sidebar). */
  author: User | null;
}

/** Returns the message's replacement content, or null to leave it as plain text. */
export type TextRenderer = (text: string, message: RenderedMessage) => ReactNode | null;

export interface MessagesApi {
  /** Renderers run in feature order; the first that returns content wins. */
  renderText(renderer: TextRenderer): void;
  /**
   * Changes a message's text before renderers see it and the site shows it, e.g. to
   * undo an encoding. Covers history too, as it renders.
   */
  rewriteText(rewrite: (text: string) => string | undefined): void;
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
  /** Shows a line in the group chat list at the current point of the conversation, if `room` is on screen. */
  notice(room: RoomId, content: ReactNode): void;
}

const renderers = new Pipeline<TextRenderer>();
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
  return function RxeMessageText({ text, author }: RenderedMessage) {
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
      root.current?.render(renderMessageText({ text, author }));
    }, [text, author, version]);

    return react.createElement("rxe-text", { ref: host });
  };
}

interface Notice {
  key: string;
  owner: Scope;
  room: RoomId;
  content: ReactNode;
  /** How many message groups the list had when the notice arrived; it renders after them. */
  after: number;
}

const MAX_NOTICES = 100;
let notices: readonly Notice[] = [];
let noticeCount = 0;
let renderedGroups = 0;
const noticeListeners = new Set<() => void>();

function setNotices(next: readonly Notice[]): void {
  notices = next;
  for (const listener of noticeListeners) listener();
}

function subscribeNotices(listener: () => void): () => void {
  noticeListeners.add(listener);
  return () => {
    noticeListeners.delete(listener);
  };
}

/** The site's `<li>` for one notice, with RxE content in a shadow root. */
function createNoticeItem(react: SiteReact) {
  // biome-ignore lint/correctness/noComponentHookFactories: built against the site's React instance, which only exists at runtime.
  return function RxeNotice({ content }: { content: ReactNode }) {
    const item = react.useRef<HTMLLIElement>(null);
    const root = react.useRef<MountedRoot | null>(null);

    react.useLayoutEffect(() => {
      const element = item.current!;
      root.current = mountRoot(element, "append");
      root.current.render(content);
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

    return react.createElement("li", { ref: item, className: NOTICE_CLASS });
  };
}

function createNoticeList(react: SiteReact) {
  const NoticeItem = createNoticeItem(react);
  const getNotices = () => notices;

  // biome-ignore lint/correctness/noComponentHookFactories: built against the site's React instance, which only exists at runtime.
  return function RxeNoticeList({ rows }: { rows: readonly ReactNode[] }) {
    const all = react.useSyncExternalStore(subscribeNotices, getNotices);
    const room = currentGroupRoom();
    const visible = all.filter((notice) => notice.room === room);
    if (visible.length === 0) return rows;

    const item = (notice: Notice) =>
      react.createElement(NoticeItem, { key: notice.key, content: notice.content });
    const out: ReactNode[] = [];
    let next = 0;
    for (let index = 0; index <= rows.length; index++) {
      while (next < visible.length && Math.min(visible[next]!.after, rows.length) <= index) {
        out.push(item(visible[next]!));
        next += 1;
      }
      if (index < rows.length) out.push(rows[index]);
    }
    return out;
  };
}

let textHost: ReturnType<typeof createTextHost> | undefined;
let noticeList: ReturnType<typeof createNoticeList> | undefined;

/** Called from the patched site code. Must never throw. */
const hooks = {
  text(value: unknown, group: unknown): unknown {
    if (typeof value !== "string") return value;
    const author = authorOf(group);
    const text = rewriteText(value);
    if (renderers.size === 0) return text;
    const message = { text, author };
    // Plain messages stay plain text nodes; only messages a renderer changes get an RxE root.
    if (renderMessageText(message) === text) return text;
    const react = siteReact();
    if (!react) return text;
    textHost ??= createTextHost(react);
    return react.createElement(textHost, message);
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
  /** Always wraps, so the first notice doesn't remount every row. */
  withNotices(groups: unknown, rows: unknown): unknown {
    if (!Array.isArray(groups) || !Array.isArray(rows)) return rows;
    renderedGroups = groups.length;
    const react = siteReact();
    if (!react) return rows;
    noticeList ??= createNoticeList(react);
    return react.createElement(noticeList, { rows: rows as ReactNode[] });
  },
};

/** Registers the surface's patches. Called synchronously at boot, before chunks load. */
export function installMessagesSurface(): void {
  registerPatches("surface:messages", PATCHES);
  exposeSurface("messages", hooks);
  // The list spaces rows 15px apart; notices are lighter and sit closer.
  injectStyle("messages-notices", `.${NOTICE_CLASS}{list-style:none;margin-block:-8px}`);
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
    if (notices.some((notice) => notice.owner === scope)) {
      setNotices(notices.filter((notice) => notice.owner !== scope));
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
    notice(room, content) {
      // Group chat only listens to the room on screen; anything else has nowhere to go.
      if (room !== currentGroupRoom()) return;
      noticeCount += 1;
      const notice = {
        key: `rxe-notice-${noticeCount}`,
        owner: scope,
        room,
        content,
        after: renderedGroups,
      };
      // Notices only live as long as their room is on screen.
      const kept = notices.filter((other) => other.room === room).slice(-(MAX_NOTICES - 1));
      setNotices([...kept, notice]);
    },
  };
}
