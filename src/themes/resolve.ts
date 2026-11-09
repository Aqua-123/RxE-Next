import { SITE_TOKENS } from "@/site/tokens";
import { ANCHORS, RXE_DEFAULTS } from "./builtin/defaults";
import { contrastRatio, ensureContrast, type Hex, mix, normalize, shade, withAlpha } from "./color";
import type { SeedName, Theme } from "./model";

/** Every token's value for a theme: the base's defaults with the theme's overrides on top. */
export function resolveTokens(theme: Pick<Theme, "base" | "tokens">): Record<string, Hex> {
  const values: Record<string, Hex> = {};
  for (const token of SITE_TOKENS) values[token.name] = normalize(token[theme.base])!;
  for (const [name, value] of Object.entries(RXE_DEFAULTS[theme.base]))
    values[name] = normalize(value)!;
  return { ...values, ...theme.tokens };
}

const BLACK = ANCHORS.black as Hex;
const WHITE = ANCHORS.white as Hex;
const INK = ANCHORS.ink as Hex;

/** WCAG AA for body text. */
const READABLE = 4.5;

/**
 * Lightness steps for the surface ramp, as shades of the surface color itself so the
 * theme's hue carries into chips, hovers and borders. Light themes step darker.
 */
const SURFACE_STEPS: Record<string, number> = {
  "base1-550": 0.02,
  "base1-500": 0.05,
  "base1-800": 0.07,
  "base1-700": 0.09,
  "base1-750": 0.11,
  "base1-450": 0.1,
  "base1-400": 0.12,
  "base1-350": 0.14,
  "base1-300": 0.17,
};

/** Surfaces the site puts muted text on (chips use base1-300, panels base1-600). */
const MUTED_TEXT_BACKGROUNDS = ["base1-850", "base1-600", "base1-500", "base1-300"] as const;

/** Muted text shades, each pushed toward the main text color until it reads on every surface. */
function mutedText(text: Hex, tokens: Record<string, Hex>): Record<string, Hex> {
  const background = tokens["base1-850"]!;
  const surfaces = MUTED_TEXT_BACKGROUNDS.map((name) => tokens[name]!);
  const muted = (weight: number) =>
    ensureContrast(mix(text, background, weight), text, surfaces, READABLE);
  return {
    "base1-100": muted(0.72),
    "base1-150": muted(0.64),
    "base1-200": muted(0.58),
    "base1-250": muted(0.6),
  };
}

/**
 * The editor's simple mode: one seed color regenerates the ramp it anchors, using the
 * theme's other current colors so the result stays coherent and readable.
 */
export function tokensFromSeed(theme: Theme, seed: SeedName, value: Hex): Record<string, Hex> {
  const current = resolveTokens(theme);
  const text = seed === "text" ? value : current["primary-content"]!;
  // Light themes step darker, and in smaller steps: dark-on-light differences read stronger.
  const direction = theme.base === "dark" ? 1 : -0.6;

  switch (seed) {
    case "background": {
      const tokens = {
        "base1-850": value,
        "base1-900": mix(theme.base === "dark" ? BLACK : WHITE, value, 0.35),
        "base1-650": shade(value, 0.03 * direction),
      };
      return { ...tokens, ...mutedText(text, { ...current, ...tokens }) };
    }
    case "surface": {
      const tokens: Record<string, Hex> = { "base1-600": value };
      for (const [name, step] of Object.entries(SURFACE_STEPS))
        tokens[name] = shade(value, step * direction);
      return { ...tokens, ...mutedText(text, { ...current, ...tokens }) };
    }
    case "text":
      return {
        "primary-content": value,
        "primary-content-10": withAlpha(value, 0.1),
        "primary-content-30": withAlpha(value, 0.3),
        "primary-content-70": withAlpha(value, 0.73),
        ...mutedText(value, current),
      };
    case "accent": {
      const lighter = (amount: number) => mix(WHITE, value, amount);
      const darker = (amount: number) => mix(BLACK, value, amount);
      return {
        "primary-300": lighter(0.25),
        "primary-400": lighter(0.12),
        "primary-500": value,
        "primary-600": darker(0.1),
        "primary-700": darker(0.3),
        "primary-800": darker(0.45),
        "rxe-accent-1": value,
        "rxe-mention": withAlpha(value, 0.2),
        "rxe-accent-foreground": contrastText(value),
      };
    }
  }
}

/** Dark ink or white, whichever contrasts more with `color`. */
export function contrastText(color: Hex): Hex {
  return contrastRatio(INK, color) >= contrastRatio(WHITE, color) ? INK : WHITE;
}

/** Builds a complete theme's tokens from seeds, applied in a stable order. */
export function tokensFromSeeds(
  theme: Theme,
  seeds: Partial<Record<SeedName, Hex>>
): Record<string, Hex> {
  let working = theme;
  for (const seed of ["background", "surface", "text", "accent"] as const) {
    const value = seeds[seed];
    if (!value) continue;
    working = {
      ...working,
      tokens: { ...working.tokens, ...tokensFromSeed(working, seed, value) },
    };
  }
  return working.tokens;
}
