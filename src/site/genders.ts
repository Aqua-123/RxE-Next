import { store } from "@/core/storage";
import type { Gender, UserId } from "./model";

/**
 * Genders RxE has seen, by user id. The site's online list, history and profiles leave
 * gender out; only live room events (joins, typing, messages) carry it. Remembering it,
 * across visits, lets everyone already seen get their gender back wherever they appear.
 */
const KEY = "genders";
/** About 15 bytes each in storage. */
const MAX = 20_000;
const CODES: Record<Exclude<Gender, "unknown">, string> = { male: "m", female: "f", other: "o" };
const FROM_CODE: Record<string, Gender> = { m: "male", f: "female", o: "other" };

let known: Map<UserId, Gender> | undefined;
const listeners = new Set<(id: UserId, gender: Gender) => void>();
let saveQueued = false;

function load(): Map<UserId, Gender> {
  known ??= new Map(
    Object.entries(store.get<Record<string, string>>(KEY, {})).flatMap(([id, code]) =>
      FROM_CODE[code] ? [[Number(id) as UserId, FROM_CODE[code]] as const] : []
    )
  );
  return known;
}

function save(): void {
  if (saveQueued) return;
  saveQueued = true;
  setTimeout(() => {
    saveQueued = false;
    const entries = [...load()].slice(-MAX);
    store.set(
      KEY,
      Object.fromEntries(entries.map(([id, gender]) => [id, CODES[gender as keyof typeof CODES]]))
    );
  }, 2000);
}

export function rememberedGender(id: UserId): Gender | undefined {
  return load().get(id);
}

/** Records what an event revealed. Most recent last, so the oldest drop off first. */
export function rememberGender(id: UserId, gender: Gender): void {
  if (gender === "unknown") return;
  const map = load();
  const previous = map.get(id);
  map.delete(id);
  map.set(id, gender);
  if (previous === gender) return;
  save();
  for (const listener of listeners) listener(id, gender);
}

/** Called when a user's gender is first learned or changes. */
export function onGenderLearned(listener: (id: UserId, gender: Gender) => void): void {
  listeners.add(listener);
}
