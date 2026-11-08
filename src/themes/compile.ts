import { SITE_TOKENS } from "@/site/tokens";
import { opaquePart, withAlpha } from "./color";
import { fontStack, type Theme } from "./model";
import { resolveTokens } from "./resolve";
import { RXE_TOKENS } from "./tokens";

export interface CompileInput {
  theme: Theme;
  /** Resolved wallpaper image URL (uploads are object URLs), or null for none. */
  wallpaperUrl: string | null;
  /** Site panels that get the glass effect. */
  glassTargets: readonly string[];
}

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
