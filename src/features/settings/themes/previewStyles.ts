import type { Theme } from "@/themes/model";
import { resolveTokens } from "@/themes/resolve";
import { ALL_TOKENS } from "@/themes/tokens";
import { setGeneratedStyles } from "@/ui/styles";

/**
 * Dynamic colors reach components through generated stylesheets keyed by data
 * attributes, never inline styles:
 *   [data-swatch="<token>"]        shows a token's live value (the draft is applied to :root)
 *   [data-theme-preview="<id>"]    sets the --pv-* colors a gallery card's mock uses
 */

let swatchesInstalled = false;

export function installSwatchStyles(): void {
  if (swatchesInstalled) return;
  swatchesInstalled = true;
  setGeneratedStyles(
    "theme-swatches",
    ALL_TOKENS.map(
      (token) => `[data-swatch="${token.name}"]{background:var(--${token.name})}`
    ).join("")
  );
}

const PREVIEW_TOKENS = {
  background: "base1-850",
  surface: "base1-600",
  text: "primary-content",
  muted: "base1-100",
  "accent-1": "rxe-accent-1",
  "accent-2": "rxe-accent-2",
  "accent-3": "rxe-accent-3",
} as const;

export function setPreviewStyles(themes: readonly Theme[]): void {
  setGeneratedStyles(
    "theme-previews",
    themes
      .map((theme) => {
        const tokens = resolveTokens(theme);
        const declarations = Object.entries(PREVIEW_TOKENS)
          .map(([name, token]) => `--pv-${name}:${tokens[token]}`)
          .join(";");
        return `[data-theme-preview="${theme.id}"]{${declarations}}`;
      })
      .join("")
  );
}
