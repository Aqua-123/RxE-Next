/**
 * The site's 72 design tokens (`:root` and its unused `[data-theme="light-mode"]`
 * set), read from the live stylesheet. Allowed to hold color values (see biome.json).
 *
 * `role` tells the theme engine how a token is used:
 *   surface – backgrounds and borders; made translucent when a wallpaper shows through
 *   text    – foreground colors
 *   accent  – brand, status and decorative colors
 */

export type TokenRole = "surface" | "text" | "accent";

export interface SiteToken {
  name: string;
  group: string;
  role: TokenRole;
  label?: string;
  dark: string;
  light: string;
}

type Row = [name: string, role: TokenRole, dark: string, light: string, label?: string];

const groups: Record<string, Row[]> = {
  Neutrals: [
    ["base1-100", "text", "#a3b3ca", "#4a4a4a", "Muted text"],
    ["base1-150", "text", "#94a3b8", "#6a6a6a", "Secondary text"],
    ["base1-200", "text", "#8896ab", "#808080"],
    ["base1-250", "text", "#9095b0", "#969696"],
    ["base1-300", "surface", "#52566c", "#b3b3b3", "Strong border"],
    ["base1-350", "surface", "#4d505d", "#cacaca"],
    ["base1-400", "surface", "#454960", "#dadada"],
    ["base1-450", "surface", "#42465b", "#e2e2e2"],
    ["base1-500", "surface", "#3c3f4e", "#e8e8e8", "Raised surface"],
    ["base1-550", "surface", "#383b4e", "#f0f0f0"],
    ["base1-600", "surface", "#303343", "#fafafa", "Panels and menus"],
    ["base1-650", "surface", "#313235", "#f5f5f5"],
    ["base1-700", "surface", "#444755", "#ececec", "Hover"],
    ["base1-750", "surface", "#4c5067", "#e2e2e2"],
    ["base1-800", "surface", "#41455c", "#d9d9d9"],
    ["base1-850", "surface", "#262834", "#f9f9f9", "App background"],
    ["base1-900", "surface", "#1e202a", "#ffffff", "Deepest background"],
  ],
  Overlays: [
    ["base2-50", "surface", "#00000017", "#00000010"],
    ["base2-100", "surface", "#45496085", "#cccccc80", "Scrim"],
    ["base2-150", "surface", "#878787", "#bfbfbf"],
    ["base2-200", "surface", "#757575", "#a6a6a6"],
    ["base2-250", "surface", "#616161", "#8c8c8c"],
    ["black", "accent", "#000000", "#000000"],
  ],
  Text: [
    ["primary-content", "text", "#ffffff", "#000000", "Text"],
    ["primary-content-10", "text", "#ffffff1a", "#00000010", "Text 10% (dividers)"],
    ["primary-content-30", "text", "#ffffff4d", "#0000004d", "Text 30%"],
    ["primary-content-70", "text", "#ffffffba", "#000000b3", "Text 70%"],
  ],
  Primary: [
    ["primary-200", "accent", "#8ea3943b", "#8ea3943b"],
    ["primary-300", "accent", "#4be474", "#4be474", "Online / success"],
    ["primary-400", "accent", "#81c784", "#81c784"],
    ["primary-500", "accent", "#34a853", "#34a853", "Brand"],
    ["primary-600", "accent", "#27ae60", "#27ae60"],
    ["primary-700", "accent", "#24753a", "#24753a"],
    ["primary-800", "accent", "#00764d", "#00764d"],
    ["primary-900", "accent", "#282e2c", "#282e2c"],
  ],
  Info: [
    ["info-100", "accent", "#83caff", "#dff7ff"],
    ["info-200", "accent", "#48acff", "#bfefff"],
    ["info-300", "accent", "#1e86ff", "#99e6ff"],
    ["info-400", "accent", "#0664ff", "#66dfff"],
    ["info-500", "accent", "#004fff", "#33d4ff", "Info"],
    ["info-600", "accent", "#083dc5", "#2bb8e6"],
    ["info-700", "accent", "#0d399b", "#229ac4"],
    ["info-800", "accent", "#0e245d", "#1a7fa3"],
  ],
  Warning: [
    ["warning-100", "accent", "#fffaed", "#fff8e5"],
    ["warning-200", "accent", "#fff3d4", "#ffefcb"],
    ["warning-300", "accent", "#ffe4a8", "#ffe2a1"],
    ["warning-400", "accent", "#ffcf71", "#ffd377"],
    ["warning-500", "accent", "#ffb74d", "#ffc04d", "Warning"],
    ["warning-600", "accent", "#fe9411", "#e6aa40"],
    ["warning-700", "accent", "#ef7907", "#bf8d33"],
    ["warning-800", "accent", "#cb6719", "#996f26"],
  ],
  Error: [
    ["error-100", "accent", "#fde5e3", "#ffedeb"],
    ["error-200", "accent", "#fdcfcb", "#ffd5d2"],
    ["error-300", "accent", "#faada7", "#ffb7b1"],
    ["error-400", "accent", "#f57d74", "#ff8f8a"],
    ["error-500", "accent", "#e94235", "#f25454", "Error"],
    ["error-600", "accent", "#d8372a", "#d94c4c"],
    ["error-700", "accent", "#b52b20", "#b54040"],
    ["error-800", "accent", "#96271e", "#9e3939"],
  ],
  Premium: [
    ["gold-btn-bg", "accent", "#efbf04", "#ffd700", "Gold button"],
    ["gold-btn-hover", "accent", "#af8d06", "#e6be00", "Gold button hover"],
    ["platinum-btn-bg", "accent", "#aaf7fc", "#f0ffff", "Platinum button"],
    ["platinum-btn-hover", "accent", "#4aa2a8", "#b0e0e6", "Platinum button hover"],
    ["premium", "accent", "#fef08a", "#fff8d9", "Premium badge"],
  ],
};

export const SITE_TOKENS: readonly SiteToken[] = Object.entries(groups).flatMap(([group, rows]) =>
  rows.map(([name, role, dark, light, label]) => ({ name, group, role, dark, light, label }))
);

export const SITE_TOKEN_NAMES: ReadonlySet<string> = new Set(
  SITE_TOKENS.map((token) => token.name)
);
