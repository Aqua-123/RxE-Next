import * as v from "valibot";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { BUILTIN_THEMES, DEFAULT_THEME, isBuiltin } from "./builtin";
import type { Hex } from "./color";
import { DEFAULT_THEME_ID, parseTheme, type SeedName, type Theme, ThemeSchema } from "./model";
import { tokensFromSeed } from "./resolve";
import { deleteWallpaper, importWallpaper, wallpaperDataUrl } from "./wallpapers";

interface ThemeState {
  activeId: string;
  custom: Theme[];
  /** The theme being edited; applied live instead of the active theme. Never persisted. */
  draft: Theme | null;
}

export const themeStore = createStore<ThemeState>()(
  persist((): ThemeState => ({ activeId: DEFAULT_THEME_ID, custom: [], draft: null }), {
    name: "rxe-next:themes",
    version: 1,
    partialize: ({ activeId, custom }) => ({ activeId, custom }),
    // Drops anything that no longer validates instead of failing to load.
    merge: (persisted, current) => {
      const saved = (persisted ?? {}) as Partial<ThemeState>;
      const custom = (saved.custom ?? []).flatMap((theme) => {
        const parsed = v.safeParse(ThemeSchema, theme);
        return parsed.success ? [parsed.output] : [];
      });
      return { ...current, custom, activeId: saved.activeId ?? DEFAULT_THEME_ID };
    },
  })
);

export function allThemes(state = themeStore.getState()): Theme[] {
  return [...BUILTIN_THEMES, ...state.custom];
}

export function findTheme(id: string, state = themeStore.getState()): Theme | undefined {
  return allThemes(state).find((theme) => theme.id === id);
}

/** What the site shows right now: the draft while editing, otherwise the active theme. */
export function appliedTheme(state = themeStore.getState()): Theme {
  return state.draft ?? findTheme(state.activeId, state) ?? DEFAULT_THEME;
}

export function activateTheme(id: string): void {
  if (findTheme(id)) themeStore.setState({ activeId: id, draft: null });
}

const newId = () => `custom:${crypto.randomUUID()}`;

/** Built-in themes are edited as a new copy; custom themes in place. */
export function editTheme(id: string): void {
  const theme = findTheme(id);
  if (!theme) return;
  themeStore.setState({
    draft: isBuiltin(id)
      ? { ...theme, id: newId(), name: `${theme.name} (custom)`, author: undefined }
      : theme,
  });
}

/** Starts a new theme as a copy of an existing one. */
export function newThemeFrom(id: string): void {
  const theme = findTheme(id);
  if (theme)
    themeStore.setState({
      draft: { ...theme, id: newId(), name: `${theme.name} copy`, author: undefined },
    });
}

export function updateDraft(update: (draft: Theme) => Theme): void {
  const { draft } = themeStore.getState();
  if (draft) themeStore.setState({ draft: update(draft) });
}

export function setDraftSeed(seed: SeedName, value: Hex): void {
  updateDraft((draft) => ({
    ...draft,
    seeds: { ...draft.seeds, [seed]: value },
    tokens: { ...draft.tokens, ...tokensFromSeed(draft, seed, value) },
  }));
}

export function setDraftToken(name: string, value: Hex | null): void {
  updateDraft((draft) => {
    const tokens = { ...draft.tokens };
    if (value) tokens[name] = value;
    else delete tokens[name];
    return { ...draft, tokens };
  });
}

/** Validates and saves the draft, then makes it the active theme. */
export function saveDraft(): void {
  const { draft, custom } = themeStore.getState();
  if (!draft) return;
  const theme = parseTheme(draft);
  const exists = custom.some((entry) => entry.id === theme.id);
  themeStore.setState({
    custom: exists
      ? custom.map((entry) => (entry.id === theme.id ? theme : entry))
      : [...custom, theme],
    activeId: theme.id,
    draft: null,
  });
}

export function discardDraft(): void {
  themeStore.setState({ draft: null });
}

export async function deleteTheme(id: string): Promise<void> {
  if (isBuiltin(id)) return;
  const { custom, activeId } = themeStore.getState();
  const theme = custom.find((entry) => entry.id === id);
  themeStore.setState({
    custom: custom.filter((entry) => entry.id !== id),
    activeId: activeId === id ? DEFAULT_THEME_ID : activeId,
  });
  if (theme?.wallpaper?.source.kind === "upload") await deleteWallpaper(theme.wallpaper.source.id);
}

const ExportSchema = v.object({
  rxeTheme: v.literal(1),
  theme: ThemeSchema,
  /** Uploaded wallpapers as data URLs, keyed by their id in `theme`. */
  assets: v.optional(v.record(v.string(), v.string()), {}),
});

export async function exportTheme(id: string): Promise<string> {
  const theme = findTheme(id);
  if (!theme) throw new Error("Theme not found");
  const assets: Record<string, string> = {};
  if (theme.wallpaper?.source.kind === "upload") {
    const data = await wallpaperDataUrl(theme.wallpaper.source.id);
    if (data) assets[theme.wallpaper.source.id] = data;
  }
  return JSON.stringify({ rxeTheme: 1, theme, assets }, null, 2);
}

export class ThemeImportError extends Error {}

/** Adds an exported theme as a new custom theme and returns it. */
export async function importTheme(text: string): Promise<Theme> {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new ThemeImportError("That isn't a theme file (not valid JSON).");
  }
  const parsed = v.safeParse(ExportSchema, payload);
  if (!parsed.success)
    throw new ThemeImportError(`That theme file is invalid: ${parsed.issues[0]?.message}`);

  let theme: Theme = { ...parsed.output.theme, id: newId() };
  const source = theme.wallpaper?.source;
  if (theme.wallpaper && source?.kind === "upload") {
    const data = parsed.output.assets[source.id];
    theme = data
      ? {
          ...theme,
          wallpaper: {
            ...theme.wallpaper,
            source: { kind: "upload", id: await importWallpaper(data) },
          },
        }
      : { ...theme, wallpaper: null };
  }
  themeStore.setState(({ custom }) => ({ custom: [...custom, theme] }));
  return theme;
}
