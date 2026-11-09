import { createElement, Fragment, type ReactNode } from "react";
import { Pipeline, type Scope } from "@/core/scope";
import { attempt } from "@/platform/log";
import { type SiteReact, siteReact } from "@/platform/modules";
import { exposeSurface, type Patch, registerPatches } from "@/platform/webpack";
import { type MountedRoot, mountRoot } from "@/ui/mount";
import type { User, UserId } from "../model";
import { parseUser } from "../wire";

/**
 * Group chat's "Online in this chat" list: `OnlineUsers({data, title})` renders a
 * count, then `<ul>` of `UserPreview` triggers. The patches let RxE reorder `data`
 * and put tools under the count, and hand over `UserPreview`, the site's profile
 * popup, so RxE can open any profile.
 */
const PATCHES: Patch[] = [
  {
    find: 'title:"Online in this chat"',
    replace: [
      {
        match:
          /(\i=(\i)=>\{let\{data:(\i),title:\i\}=\2;)return(?=\(0,\i\.jsxs\)\(\i\.Fragment,\{children:\[\(0,\i\.jsxs\)\("span",\{className:"toggleSidebarTitle")/,
        with: "$1$3=$rxe.userList.useUsers($3);return",
      },
      {
        match:
          /(\(0,\i\.jsxs\)\("span",\{className:"toggleSidebarTitle",children:\[" ",(\i)\.length>0\?\2\.length:0," ",\i\]\}\),)(\(0,\i\.jsx\)\("ul",\{className:"toggleSidebarList",children:null==\2\?void 0:\2\.map\(\i=>\{var \i;return\(null==\i\?void 0:\i\.id\)&&\(0,\i\.jsx\)\((\i)\.Z,)/,
        with: "$1$rxe.userList.tools($4.Z),$3",
      },
    ],
  },
];

export type UserOrder = (a: User, b: User) => number;

export interface UserListTools {
  /** Opens the site's profile popup for any user. */
  openProfile(id: UserId): void;
}

export interface UserListApi {
  /** Orders the online list. Features earlier in FEATURES win; null keeps the site's order. */
  sortBy(order: UserOrder | null): void;
  /** Renders controls under the list's "N Online" heading. */
  addTools(render: (tools: UserListTools) => ReactNode): void;
}

const orders = new Map<Scope, UserOrder | null>();
const toolRenderers = new Pipeline<(tools: UserListTools) => ReactNode>();
let version = 0;
const listeners = new Set<() => void>();

function changed(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getVersion = () => version;

function currentOrder(): UserOrder | null {
  const [first] = [...orders.entries()]
    .filter(([, order]) => order)
    .sort(([a], [b]) => a.order - b.order);
  return first?.[1] ?? null;
}

const parsed = new WeakMap<object, User | null>();
function userOf(raw: unknown): User | null {
  if (!raw || typeof raw !== "object") return null;
  if (!parsed.has(raw)) parsed.set(raw, parseUser(raw));
  return parsed.get(raw) ?? null;
}

function sorted(users: readonly unknown[]): unknown[] {
  const order = currentOrder();
  if (!order) return [...users];
  return [...users].sort((a, b) => {
    const left = userOf(a);
    const right = userOf(b);
    if (!left || !right) return 0;
    return attempt("user order", () => order(left, right)) ?? 0;
  });
}

let onlineCount: number | null = null;
const countListeners = new Set<() => void>();

/** How many are online in the group chat on screen, or null where there is no list. */
export function onlineUserCount(): number | null {
  return onlineCount;
}

export function onOnlineCountChange(listener: () => void): () => void {
  countListeners.add(listener);
  return () => {
    countListeners.delete(listener);
  };
}

function publishCount(count: number | null): void {
  if (count === onlineCount) return;
  onlineCount = count;
  // Listeners re-render RxE roots; never do that while the site is rendering.
  queueMicrotask(() => {
    for (const listener of countListeners) attempt("online count", listener);
  });
}

type Preview = (props: { user_id: number; trigger: unknown }) => unknown;

function createTools(react: SiteReact) {
  // biome-ignore lint/correctness/noComponentHookFactories: built against the site's React instance, which only exists at runtime.
  return function RxeUserListTools({ Preview }: { Preview: Preview }) {
    const host = react.useRef<HTMLElement>(null);
    const root = react.useRef<MountedRoot | null>(null);
    const trigger = react.useRef<HTMLButtonElement>(null);
    const [openId, setOpenId] = react.useState<number | null>(null);
    const current = react.useSyncExternalStore(subscribe, getVersion);

    react.useLayoutEffect(() => {
      root.current = mountRoot(host.current!, "append");
      return () => {
        root.current?.unmount();
        root.current = null;
      };
    }, []);
    react.useLayoutEffect(() => {
      const tools: UserListTools = { openProfile: (id) => setOpenId(Number(id)) };
      root.current?.render(
        [...toolRenderers].map((render, index) =>
          createElement(
            Fragment,
            { key: index },
            attempt("user list tools", () => render(tools))
          )
        )
      );
    }, [current]);
    // The site opens its popup from the trigger's click; render one, click it, drop it.
    react.useEffect(() => {
      if (openId === null) return;
      trigger.current?.click();
      setOpenId(null);
    }, [openId]);

    return react.createElement(
      react.Fragment,
      null,
      react.createElement("rxe-text", { ref: host }),
      openId !== null &&
        react.createElement(Preview as never, {
          user_id: openId,
          trigger: react.createElement("button", { ref: trigger, type: "button", hidden: true }),
        })
    );
  };
}

let tools: ReturnType<typeof createTools> | undefined;

/** Uses the site's hooks inside the patched list. */
function useSortedUsers(react: SiteReact, users: readonly unknown[]): unknown[] {
  const current = react.useSyncExternalStore(subscribe, getVersion);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `current` changes when the order does.
  const result = react.useMemo(() => sorted(users), [users, current]);
  react.useEffect(() => {
    publishCount(users.length);
    return () => publishCount(null);
  }, [users.length]);
  return result;
}

/** Called from the patched list. Must never throw. */
const hooks = {
  /** Runs on every render of the list and uses the site's hooks there. */
  useUsers(users: unknown): unknown {
    // The list itself is a React component, so the site's React is loaded by now.
    return useSortedUsers(siteReact()!, Array.isArray(users) ? users : []);
  },
  tools(Preview: unknown): unknown {
    const react = siteReact();
    if (!react || typeof Preview !== "function") return null;
    tools ??= createTools(react);
    return react.createElement(tools, { Preview: Preview as Preview });
  },
};

export function installUserListSurface(): void {
  registerPatches("surface:userList", PATCHES);
  exposeSurface("userList", hooks);
}

export function scopedUserList(scope: Scope): UserListApi {
  scope.add(() => {
    if (orders.delete(scope)) changed();
  });
  return {
    sortBy(order) {
      orders.set(scope, order);
      changed();
    },
    addTools(render) {
      const remove = toolRenderers.add(scope, render);
      changed();
      scope.add(() => {
        remove();
        changed();
      });
    },
  };
}
