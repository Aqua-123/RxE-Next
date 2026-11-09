import type { Scope } from "@/core/scope";
import { siteContext } from "./contexts";
import type { Conversation, User, UserId } from "./model";
import { mutedUserIds, onSitePrefsChange } from "./prefs";
import { parseConversations, parseUser } from "./wire";

export interface SiteApi {
  /** The signed-in user, or null before the site has loaded it. */
  currentUser(): User | null;
  /** Your most recent DM threads, newest first. */
  recentConversations(): Promise<Conversation[]>;
  mutes: {
    has(id: UserId): boolean;
    /** Calls `listener` now and whenever the muted set changes. */
    watch(listener: (ids: ReadonlySet<UserId>) => void): void;
  };
}

export function currentUser(): User | null {
  return parseUser(siteContext("auth")?.user);
}

const API = "https://api.emeraldchat.com/api/v1";

async function recentConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API}/user/friends/messages?page=1`, { credentials: "include" });
  if (!response.ok) throw new Error(`Couldn't load your messages (${response.status}).`);
  return parseConversations(await response.json());
}

export function scopedSite(scope: Scope): SiteApi {
  return {
    currentUser,
    recentConversations,
    mutes: {
      has: (id) => mutedUserIds().has(id),
      watch(listener) {
        listener(mutedUserIds());
        scope.add(onSitePrefsChange(() => listener(mutedUserIds())));
      },
    },
  };
}
