import type { Hex } from "../color";
import { DEFAULT_THEME_ID, parseTheme, type SeedName, type Theme, type ThemeInput } from "../model";
import { tokensFromSeeds } from "../resolve";

interface BuiltinDefinition {
  id: string;
  name: string;
  author?: string;
  base: "dark" | "light";
  seeds?: Partial<Record<SeedName, string>>;
  tokens?: Record<string, string>;
  font?: ThemeInput["font"];
  glass?: boolean;
}

function builtin(definition: BuiltinDefinition): Theme {
  const seeds = (definition.seeds ?? {}) as Partial<Record<SeedName, Hex>>;
  const draft = parseTheme({
    schema: 1,
    ...definition,
    id: `builtin:${definition.id}`,
    seeds,
    tokens: {},
  });
  return parseTheme({
    ...draft,
    tokens: { ...tokensFromSeeds(draft, seeds), ...definition.tokens },
  });
}

/** Fresh themes designed for the token system. */
const fresh: Theme[] = [
  builtin({ id: "emerald", name: "Emerald", author: "EmeraldChat", base: "dark" }),
  builtin({
    id: "midnight",
    name: "Midnight",
    base: "dark",
    seeds: { background: "#0b0f1a", surface: "#131a2a", text: "#e6edf7", accent: "#5eead4" },
    tokens: { "rxe-accent-2": "#60a5fa", "rxe-accent-3": "#a78bfa", "rxe-link": "#7dd3fc" },
  }),
  builtin({
    id: "sakura",
    name: "Sakura",
    base: "light",
    seeds: { background: "#fff6f9", surface: "#ffe8f0", text: "#3a2230", accent: "#d9468a" },
    tokens: { "rxe-accent-2": "#f08cb6", "rxe-accent-3": "#f5a26f", "rxe-link": "#b02f6b" },
    font: "rounded",
  }),
  builtin({
    id: "mocha",
    name: "Mocha",
    base: "dark",
    seeds: { background: "#1d1613", surface: "#2a201b", text: "#f3e7dc", accent: "#e8a56b" },
    tokens: { "rxe-accent-2": "#d98b6c", "rxe-accent-3": "#f2cf8e", "rxe-link": "#f2b880" },
  }),
];

/** Ports of the original RxE themes. */
const ports: Theme[] = [
  builtin({
    id: "ritsu",
    name: "Ritsu",
    author: "RxE classic",
    base: "dark",
    seeds: { background: "#000000", surface: "#111111", text: "#f1f1f2", accent: "#f965fe" },
    tokens: {
      "base1-900": "#000000",
      "base1-700": "#35383e",
      "base1-100": "#afbacd",
      "rxe-accent-2": "#b821bd",
      "rxe-accent-3": "#f4a6d7",
    },
  }),
  builtin({
    id: "light",
    name: "Light",
    author: "RxE classic",
    base: "light",
    seeds: { background: "#dddddd", surface: "#cccccc", text: "#333333", accent: "#b821bd" },
    tokens: { "base1-700": "#a3adc0", "base1-100": "#666666", "rxe-accent-2": "#f965fe" },
  }),
  builtin({
    id: "teriblast",
    name: "Teriblast",
    author: "RxE classic",
    base: "dark",
    seeds: { background: "#000000", surface: "#111111", text: "#e0e0e0", accent: "#b9fc6d" },
    tokens: {
      "base1-100": "#b9fc6d",
      "base1-700": "#35383e",
      "rxe-accent-2": "#e6fc6d",
      "rxe-accent-3": "#18e281",
      "rxe-link": "#3fffe5",
    },
  }),
  builtin({
    id: "teriblast-v2",
    name: "Teriblast V2",
    author: "RxE classic",
    base: "dark",
    seeds: { background: "#000000", surface: "#330030", text: "#e0e0e0", accent: "#b9fc6d" },
    tokens: {
      "base1-100": "#b9fc6d",
      "base1-500": "#14001a",
      "base1-700": "#62034f",
      "rxe-accent-2": "#ffe8a3",
      "rxe-accent-3": "#18e281",
      "rxe-link": "#3fffe5",
    },
  }),
];

export const BUILTIN_THEMES: readonly Theme[] = [...fresh, ...ports];

export const DEFAULT_THEME = BUILTIN_THEMES.find((theme) => theme.id === DEFAULT_THEME_ID)!;

export function isBuiltin(id: string): boolean {
  return id.startsWith("builtin:");
}
