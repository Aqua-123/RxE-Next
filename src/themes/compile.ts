import { SITE_TOKENS } from "@/site/tokens";
import { alphaOf, contrastRatio, opaquePart, withAlpha } from "./color";
import { fontStack, type Theme } from "./model";
import { contrastText, resolveTokens } from "./resolve";
import { RXE_TOKENS } from "./tokens";

export interface CompileInput {
  theme: Theme;
  /** Resolved wallpaper image URL (uploads are object URLs), or null for none. */
  wallpaperUrl: string | null;
  /** Site panels that get the glass effect. */
  glassTargets: readonly string[];
}

/** Accent tokens the site uses as backgrounds; each gets a readable `--rxe-on-*` text color. */
export const ACCENT_TOKENS: readonly string[] = SITE_TOKENS.filter(
  (token) => token.role === "accent"
).map((token) => token.name);

const SURFACE_TOKENS = new Set(
  SITE_TOKENS.filter((token) => token.role === "surface").map((token) => token.name)
);

/**
 * Compiles a theme to one stylesheet for the site. Pure: same input, same CSS.
 *
 * `:root:root` outranks both the site's `:root` and `[data-theme="light-mode"]`.
 */
export function compileTheme({ theme, wallpaperUrl, glassTargets }: CompileInput): string {
  const tokens = resolveTokens(theme);
  const wallpaper = theme.wallpaper && wallpaperUrl ? theme.wallpaper : null;

  const declarations = [
    ...SITE_TOKENS.map((token) => token.name),
    ...RXE_TOKENS.map((token) => token.name),
  ].map((name) => {
    const value = tokens[name]!;
    const shown =
      wallpaper && SURFACE_TOKENS.has(name) ? withAlpha(value, wallpaper.surfaceOpacity) : value;
    return `--${name}:${shown};`;
  });
  // Text on accent backgrounds: the theme's text color while it still reads (3:1, the AA level
  // for bold UI text), otherwise ink or white. Translucent accents show the surface beneath.
  const text = tokens["primary-content"]!;
  for (const name of ACCENT_TOKENS) {
    const value = tokens[name]!;
    const keepsText = alphaOf(value) < 0.6 || contrastRatio(text, value) >= 3;
    declarations.push(
      `--rxe-on-${name}:${keepsText ? "var(--primary-content)" : contrastText(value)};`
    );
  }
  declarations.push(`--rxe-font:${fontStack(theme.font)};`);

  const blocks = [`:root:root{${declarations.join("")}}`];

  if (theme.font !== "inter") {
    blocks.push(
      "body,body *:not(svg):not(svg *):not(.material-icons){font-family:var(--rxe-font)!important}"
    );
  }

  if (wallpaper && wallpaperUrl) {
    const backdrop = opaquePart(tokens["base1-900"]!);
    const bleed = wallpaper.blur * 2;
    blocks.push(
      `html:root{background-color:${backdrop}}`,
      "body{background:transparent!important}",
      `body::before{content:"";position:fixed;inset:-${bleed}px;z-index:-1;pointer-events:none;` +
        `background:center/cover no-repeat url(${JSON.stringify(wallpaperUrl)});` +
        `filter:blur(${wallpaper.blur}px) brightness(${1 - wallpaper.dim})}`
    );
  }

  if (theme.glass && glassTargets.length) {
    blocks.push(`${glassTargets.join(",")}{backdrop-filter:blur(14px) saturate(140%)}`);
  }

  if (theme.customCss.trim()) blocks.push(theme.customCss);
  return blocks.join("\n");
}
