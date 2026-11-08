import * as v from "valibot";
import { ThemeSchema } from "@/themes/model";
import { themeStore } from "@/themes/store";
import { importWallpaper, wallpaperDataUrl } from "@/themes/wallpapers";
import { settingsStore } from "./settings";
import { store } from "./storage";

/** Everything RxE stores, as one portable document. */
const BackupSchema = v.object({
  rxeBackup: v.literal(1),
  exportedAt: v.string(),
  features: v.record(v.string(), v.boolean()),
  settings: v.record(v.string(), v.record(v.string(), v.unknown())),
  themes: v.object({ activeId: v.string(), custom: v.array(ThemeSchema) }),
  /** Uploaded wallpapers as data URLs, keyed by their id in the themes. */
  assets: v.optional(v.record(v.string(), v.string()), {}),
});

const FEATURE_PREFIX = "rxe-next:feature:";

function featureFlags(): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith(FEATURE_PREFIX)) {
      const id = key.slice(FEATURE_PREFIX.length);
      flags[id] = store.get(`feature:${id}`, true);
    }
  }
  return flags;
}

export async function exportBackup(): Promise<string> {
  const { activeId, custom } = themeStore.getState();
  const assets: Record<string, string> = {};
  for (const theme of custom) {
    if (theme.wallpaper?.source.kind !== "upload") continue;
    const data = await wallpaperDataUrl(theme.wallpaper.source.id);
    if (data) assets[theme.wallpaper.source.id] = data;
  }
  return JSON.stringify(
    {
      rxeBackup: 1,
      exportedAt: new Date().toISOString(),
      features: featureFlags(),
      settings: settingsStore.getState().values,
      themes: { activeId, custom },
      assets,
    },
    null,
    2
  );
}

export class BackupImportError extends Error {}

/** Replaces RxE's settings, feature toggles and custom themes with a backup's. */
export async function importBackup(text: string): Promise<void> {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new BackupImportError("That isn't an RxE backup (not valid JSON).");
  }
  const parsed = v.safeParse(BackupSchema, payload);
  if (!parsed.success)
    throw new BackupImportError(`That backup is invalid: ${parsed.issues[0]?.message}`);
  const backup = parsed.output;

  const uploads = new Map<string, string>();
  for (const [id, data] of Object.entries(backup.assets))
    uploads.set(id, await importWallpaper(data));
  const custom = backup.themes.custom.map((theme) => {
    const source = theme.wallpaper?.source;
    if (!theme.wallpaper || source?.kind !== "upload") return theme;
    const id = uploads.get(source.id);
    return id
      ? { ...theme, wallpaper: { ...theme.wallpaper, source: { kind: "upload" as const, id } } }
      : { ...theme, wallpaper: null };
  });

  for (const [id, enabled] of Object.entries(backup.features)) store.set(`feature:${id}`, enabled);
  settingsStore.setState({ values: backup.settings });
  themeStore.setState({ activeId: backup.themes.activeId, custom, draft: null });
}

/** Clears everything RxE stored on this site. Reload afterwards so features restart clean. */
export function resetEverything(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key?.startsWith("rxe-next:")) keys.push(key);
  }
  for (const key of keys) localStorage.removeItem(key);
  indexedDB.deleteDatabase("rxe-next");
}
