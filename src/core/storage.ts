const PREFIX = "rxe-next:";

/** Key prefix used by the old RxE (ts-preferences). Same origin, so its settings are readable here. */
const LEGACY_PREFIX = "ritsu-emerald-preference-";

function read<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const store = {
  get: <T>(key: string, fallback: T): T => read(PREFIX + key, fallback),
  set: (key: string, value: unknown): void =>
    localStorage.setItem(PREFIX + key, JSON.stringify(value)),
};

export const legacyStore = {
  get: <T>(key: string, fallback: T): T => read(LEGACY_PREFIX + key, fallback),
};
