import type { AnyCableTransport } from "@/platform/cable";
import { findContextValues } from "@/platform/react";
import type { RawUser } from "./wire";

/** The site's React context values RxE reads. Only fields RxE uses are typed. */
export interface SiteContexts {
  auth: { user: RawUser | null; isLoading: boolean; setBan(banned: boolean): void };
  prefs: {
    muted_users: Array<{ id: number }>;
    add_muted_user(user: RawUser): void;
    remove_muted_user(id: number): void;
  };
  cable: { cable: { transport?: AnyCableTransport } };
  groupChat: { messages: unknown[]; onlineUsers: unknown[]; addMessage(message: unknown): void };
}

type ContextName = keyof SiteContexts;

/** Each shape must be unique among the site's providers. */
const SHAPES: Record<ContextName, readonly string[]> = {
  auth: ["user", "isLoading", "setBan"],
  prefs: ["muted_users", "add_muted_user", "remove_muted_user"],
  cable: ["cable", "subscriptions"],
  groupChat: ["messages", "onlineUsers", "addMessage"],
};

/** Reads the current value of one site context. Never cache it: values change every render. */
export function siteContext<K extends ContextName>(name: K): SiteContexts[K] | undefined {
  return findContextValues("__next", SHAPES, [name])[name] as SiteContexts[K] | undefined;
}

/** Calls back once the site's React tree (and so its auth context) has mounted. */
export function whenSiteMounted(callback: () => void): void {
  let scheduled = false;
  const check = (): boolean => {
    if (!siteContext("auth")) return false;
    observer.disconnect();
    callback();
    return true;
  };
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      check();
    });
  });
  // `document`, not `documentElement`: at document_start the latter may not exist yet.
  if (!check()) observer.observe(document, { childList: true, subtree: true });
}
