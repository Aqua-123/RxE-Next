import { attempt } from "../platform/log";
import type { MutedUser } from "../types/site";

/**
 * The site's own preferences. Its preferences provider snapshots this key into
 * React state when it mounts and rewrites the whole object on every change.
 */
const KEY = "emerald_preferences";

export function parseMutedUsers(raw: string | null): MutedUser[] {
  let list: unknown;
  try {
    list = raw ? JSON.parse(raw).muted_users : undefined;
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((entry): MutedUser | undefined =>
      typeof entry === "number"
        ? { id: entry }
        : entry && Number.isFinite(Number(entry.id))
          ? { ...entry, id: Number(entry.id) }
          : undefined
    )
    .filter((entry): entry is MutedUser => entry !== undefined);
}

let cachedRaw: string | null | undefined;
let cachedIds: ReadonlySet<number> = new Set();

/** Cheap enough to call per cable frame: re-parses only when the stored string changes. */
export function mutedUserIds(): ReadonlySet<number> {
  const raw = localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = new Set(parseMutedUsers(raw).map((user) => user.id));
  }
  return cachedIds;
}

const listeners = new Set<() => void>();
let tapped = false;

function notify(): void {
  listeners.forEach((listener) => attempt("site prefs listener", listener));
}

/** Fires when the site's preferences change in this tab or another one. */
export function onSitePrefsChange(listener: () => void): () => void {
  if (!tapped) {
    tapped = true;
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(this: Storage, key: string, value: string) {
      nativeSetItem.call(this, key, value);
      if (this === localStorage && key === KEY) notify();
    };
    window.addEventListener("storage", (event: StorageEvent) => {
      if (event.key === KEY) notify();
    });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
