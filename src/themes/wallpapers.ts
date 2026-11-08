import { createStore, del, get, set } from "idb-keyval";

/** Uploaded wallpapers live in IndexedDB (localStorage holds ~5 MB in total). */
const store = createStore("rxe-next", "wallpapers");
const objectUrls = new Map<string, string>();

export const MAX_WALLPAPER_BYTES = 8 * 1024 * 1024;

export async function saveWallpaper(file: Blob): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Wallpapers must be images");
  if (file.size > MAX_WALLPAPER_BYTES) throw new Error("Wallpapers must be under 8 MB");
  const id = crypto.randomUUID();
  await set(id, file, store);
  return id;
}

export async function wallpaperUrl(id: string): Promise<string | null> {
  const cached = objectUrls.get(id);
  if (cached) return cached;
  const blob = await get<Blob>(id, store);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  objectUrls.set(id, url);
  return url;
}

export async function deleteWallpaper(id: string): Promise<void> {
  const url = objectUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(id);
  await del(id, store);
}

/** For exports: the upload as a self-contained data URL. */
export async function wallpaperDataUrl(id: string): Promise<string | null> {
  const blob = await get<Blob>(id, store);
  if (!blob) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** For imports: stores a data URL from an export and returns its new id. */
export async function importWallpaper(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) throw new Error("Invalid wallpaper data");
  return saveWallpaper(await (await fetch(dataUrl)).blob());
}
