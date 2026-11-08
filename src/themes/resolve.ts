import { SITE_TOKENS } from "@/site/tokens";
import { ANCHORS, RXE_DEFAULTS } from "./builtin/defaults";
import { type Hex, luminance, mix, normalize, withAlpha } from "./color";
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

/**
 * The editor's simple mode: one seed color regenerates the ramp it anchors, using the
 * theme's other current colors so the result stays coherent.
 */
export function tokensFromSeed(theme: Theme, seed: SeedName, value: Hex): Record<string, Hex> {
  const current = resolveTokens(theme);
  const text = seed === "text" ? value : current["primary-content"]!;
  const background = seed === "background" ? value : current["base1-850"]!;
  const toward = (amount: number, color = text) => mix(color, value, amount);
  const deeper = theme.base === "dark" ? BLACK : WHITE;

  switch (seed) {
    case "background":
      return {
        "base1-850": value,
        "base1-900": mix(deeper, value, 0.35),
        "base1-650": toward(0.04),
      };
    case "surface":
      return {
        "base1-600": value,
        "base1-550": toward(0.03),
        "base1-500": toward(0.07),
        "base1-700": toward(0.12),
        "base1-750": toward(0.16),
        "base1-800": toward(0.1),
        "base1-450": toward(0.14),
        "base1-400": toward(0.18),
        "base1-350": toward(0.22),
        "base1-300": toward(0.28),
      };
    case "text":
      return {
        "primary-content": value,
        "primary-content-10": withAlpha(value, 0.1),
        "primary-content-30": withAlpha(value, 0.3),
        "primary-content-70": withAlpha(value, 0.73),
        "base1-100": mix(value, background, 0.72),
        "base1-150": mix(value, background, 0.64),
        "base1-200": mix(value, background, 0.58),
        "base1-250": mix(value, background, 0.6),
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

/** Dark ink or white, whichever reads better on `color`. */
export function contrastText(color: Hex): Hex {
  return (luminance(color) > 0.4 ? ANCHORS.ink : ANCHORS.white) as Hex;
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
