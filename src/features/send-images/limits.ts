import { store } from "@/core/storage";

/** The old RxE's limit: generous for chatting, low enough to keep the hosts from banning RxE. */
export const MAX_UPLOADS = 50;
export const WINDOW_MS = 3 * 60 * 60 * 1000;
const KEY = "send-images:uploads";

function recent(now: number): number[] {
  return store.get<number[]>(KEY, []).filter((time) => now - time < WINDOW_MS);
}

/** Milliseconds until the next upload is allowed; 0 when one is allowed now. */
export function waitBeforeUpload(now = Date.now()): number {
  const times = recent(now);
  if (times.length < MAX_UPLOADS) return 0;
  return Math.min(...times) + WINDOW_MS - now;
}

export function uploadsLeft(now = Date.now()): number {
  return MAX_UPLOADS - recent(now).length;
}

export function recordUpload(now = Date.now()): void {
  store.set(KEY, [...recent(now), now]);
}
