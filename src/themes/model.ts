import * as v from "valibot";
import { type Hex, isHex } from "./color";
import { TOKEN_NAMES } from "./tokens";

/** Font stacks only; RxE never downloads fonts. */
export const FONTS = [
  { id: "inter", label: "Inter (site default)", stack: "Inter, system-ui, sans-serif" },
  {
    id: "system",
    label: "System",
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: "rounded",
    label: "Rounded",
    stack: 'ui-rounded, "SF Pro Rounded", Nunito, system-ui, sans-serif',
  },
  { id: "verdana", label: "Verdana", stack: "Verdana, Geneva, sans-serif" },
  { id: "helvetica", label: "Helvetica", stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { id: "trebuchet", label: "Trebuchet", stack: '"Trebuchet MS", system-ui, sans-serif' },
  { id: "comic", label: "Comic Sans", stack: '"Comic Sans MS", "Comic Neue", cursive' },
  { id: "serif", label: "Serif", stack: "ui-serif, Georgia, serif" },
  { id: "mono", label: "Monospace", stack: 'ui-monospace, "SF Mono", Menlo, monospace' },
] as const;

export type FontId = (typeof FONTS)[number]["id"];
const FONT_IDS = FONTS.map((font) => font.id) as [FontId, ...FontId[]];

const hex = v.pipe(
  v.string(),
  v.check(isHex, "Expected a hex color (#rgb, #rrggbb or #rrggbbaa)"),
  v.transform((value) => value.toLowerCase() as Hex)
);

export const SEED_NAMES = ["background", "surface", "text", "accent"] as const;
export type SeedName = (typeof SEED_NAMES)[number];

const between = (min: number, max: number) => v.pipe(v.number(), v.minValue(min), v.maxValue(max));

export const WallpaperSchema = v.object({
  source: v.variant("kind", [
    v.object({
      kind: v.literal("url"),
      url: v.pipe(
        v.string(),
        v.url(),
        v.check((url) => /^https?:/.test(url), "Use an http(s) URL")
      ),
    }),
    v.object({ kind: v.literal("upload"), id: v.pipe(v.string(), v.minLength(1)) }),
  ]),
  /** px */
  blur: v.optional(between(0, 40), 0),
  /** 0 = untouched, 0.9 = nearly black */
  dim: v.optional(between(0, 0.9), 0.25),
  /** How opaque the site's surfaces stay over the wallpaper. */
  surfaceOpacity: v.optional(between(0.2, 1), 0.85),
});

export const ThemeSchema = v.object({
  schema: v.literal(1),
  id: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "Give the theme a name"), v.maxLength(60)),
  author: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(60))),
  base: v.picklist(["dark", "light"]),
  seeds: v.optional(
    v.partial(v.object({ background: hex, surface: hex, text: hex, accent: hex })),
    {}
  ),
  tokens: v.optional(
    v.pipe(
      v.record(v.string(), hex),
      v.check(
        (tokens) => Object.keys(tokens).every((name) => TOKEN_NAMES.has(name)),
        "Unknown token"
      )
    ),
    {}
  ),
  font: v.optional(v.picklist(FONT_IDS), "inter"),
  wallpaper: v.optional(v.nullable(WallpaperSchema), null),
  glass: v.optional(v.boolean(), false),
  customCss: v.optional(v.pipe(v.string(), v.maxLength(50_000)), ""),
});

export type Theme = v.InferOutput<typeof ThemeSchema>;
export type ThemeInput = v.InferInput<typeof ThemeSchema>;
export type Wallpaper = v.InferOutput<typeof WallpaperSchema>;

export function parseTheme(input: unknown): Theme {
  return v.parse(ThemeSchema, input);
}

/** The first problem with an invalid theme, for showing to the user. */
export function themeProblem(input: unknown): string | null {
  const result = v.safeParse(ThemeSchema, input);
  return result.success ? null : (result.issues[0]?.message ?? "Invalid theme");
}

export function fontStack(id: FontId): string {
  return FONTS.find((font) => font.id === id)?.stack ?? FONTS[0].stack;
}

export const DEFAULT_THEME_ID = "builtin:emerald";
