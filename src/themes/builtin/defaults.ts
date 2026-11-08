/** Default values for RxE's own tokens, per base. Site token defaults live in site/tokens.ts. */

/** Anchors the seed generator mixes toward. */
export const ANCHORS = {
  black: "#000000",
  white: "#ffffff",
  /** Dark text for light accents. */
  ink: "#14121c",
} as const;

export const RXE_DEFAULTS = {
  dark: {
    "rxe-accent-1": "#b89cff",
    "rxe-accent-2": "#f4a6d7",
    "rxe-accent-3": "#ffc38a",
    "rxe-accent-foreground": "#1d1830",
    "rxe-glint": "#fff7ee",
    "rxe-link": "#8ab4ff",
    "rxe-mention": "#b89cff33",
    "rxe-mention-foreground": "#e3d9ff",
    "rxe-gender-male": "#5b9cff",
    "rxe-gender-female": "#ff7eb6",
    "rxe-gender-other": "#b89cff",
  },
  light: {
    "rxe-accent-1": "#7c5ce0",
    "rxe-accent-2": "#d6589f",
    "rxe-accent-3": "#e0873a",
    "rxe-accent-foreground": "#ffffff",
    "rxe-glint": "#ffe9c7",
    "rxe-link": "#2f62d6",
    "rxe-mention": "#7c5ce026",
    "rxe-mention-foreground": "#3b2a80",
    "rxe-gender-male": "#2f6fd6",
    "rxe-gender-female": "#d6458a",
    "rxe-gender-other": "#7c5ce0",
  },
} as const satisfies Record<"dark" | "light", Record<string, string>>;
