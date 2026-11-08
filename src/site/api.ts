import type { Scope } from "@/core/scope";
import { siteContext } from "./contexts";
import type { User, UserId } from "./model";
import { mutedUserIds, onSitePrefsChange } from "./prefs";
import { parseUser } from "./wire";

export interface SiteApi {
  /** The signed-in user, or null before the site has loaded it. */
  currentUser(): User | null;
  mutes: {
    has(id: UserId): boolean;
    /** Calls `listener` now and whenever the muted set changes. */
    watch(listener: (ids: ReadonlySet<UserId>) => void): void;
  };
}

export function currentUser(): User | null {
  return parseUser(siteContext("auth")?.user);
}

export function scopedSite(scope: Scope): SiteApi {
  return {
    currentUser,
    mutes: {
      has: (id) => mutedUserIds().has(id),
      watch(listener) {
        listener(mutedUserIds());
        scope.add(onSitePrefsChange(() => listener(mutedUserIds())));
      },
    },
  };
}
