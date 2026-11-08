const PREFIX = "rxe-next:";

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
