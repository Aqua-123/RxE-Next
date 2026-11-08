import { attempt } from "@/platform/log";
import type { UserId } from "./model";

/**
 * The site's own preferences. Its preferences provider snapshots this key into
 * React state when it mounts and rewrites the whole object on every change.
 */
const KEY = "emerald_preferences";

/** Entries are `{ id, display_name, … }` objects; older data may hold bare ids. */
export function parseMutedUserIds(raw: string | null): UserId[] {
  let list: unknown;
  try {
    list = raw ? JSON.parse(raw).muted_users : undefined;
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => Number(typeof entry === "object" && entry !== null ? entry.id : entry))
    .filter((id) => Number.isFinite(id) && id > 0) as UserId[];
}

let cachedRaw: string | null | undefined;
let cachedIds: ReadonlySet<UserId> = new Set();

/** Cheap enough to call per cable frame: re-parses only when the stored string changes. */
export function mutedUserIds(): ReadonlySet<UserId> {
  const raw = localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = new Set(parseMutedUserIds(raw));
  }
  return cachedIds;
}

const listeners = new Set<() => void>();
let tapped = false;

function notify(): void {
  for (const listener of listeners) attempt("site prefs listener", listener);
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
