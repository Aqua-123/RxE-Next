import { SITE_TOKENS, type TokenRole } from "@/site/tokens";

/** Tokens RxE adds on top of the site's. Their default values live in builtin/defaults.ts. */
export interface RxeToken {
  name: string;
  group: string;
  role: TokenRole;
  label: string;
}

export const RXE_TOKENS: readonly RxeToken[] = [
  { name: "rxe-accent-1", group: "RxE accents", role: "accent", label: "Accent" },
  { name: "rxe-accent-2", group: "RxE accents", role: "accent", label: "Accent 2" },
  { name: "rxe-accent-3", group: "RxE accents", role: "accent", label: "Accent 3" },
  { name: "rxe-accent-foreground", group: "RxE accents", role: "text", label: "Text on accent" },
  { name: "rxe-glint", group: "RxE accents", role: "accent", label: "Shimmer glint" },
  { name: "rxe-link", group: "Chat", role: "accent", label: "Links" },
  { name: "rxe-mention", group: "Chat", role: "accent", label: "Mention highlight" },
  { name: "rxe-mention-foreground", group: "Chat", role: "text", label: "Mention text" },
  { name: "rxe-gender-male", group: "Avatar borders", role: "accent", label: "Male" },
  { name: "rxe-gender-female", group: "Avatar borders", role: "accent", label: "Female" },
  { name: "rxe-gender-other", group: "Avatar borders", role: "accent", label: "Other" },
];

export interface TokenInfo {
  name: string;
  group: string;
  role: TokenRole;
  label: string;
}

/** Every token a theme can set, grouped for the editor. */
export const ALL_TOKENS: readonly TokenInfo[] = [
  ...RXE_TOKENS,
  ...SITE_TOKENS.map(({ name, group, role, label }) => ({
    name,
    group,
    role,
    label: label ?? name,
  })),
];

export const TOKEN_NAMES: ReadonlySet<string> = new Set(ALL_TOKENS.map((token) => token.name));

/** Tokens grouped for the editor, in catalog order. */
export const TOKEN_GROUPS: ReadonlyArray<readonly [group: string, tokens: readonly TokenInfo[]]> = [
  ...ALL_TOKENS.reduce((groups, token) => {
    groups.set(token.group, [...(groups.get(token.group) ?? []), token]);
    return groups;
  }, new Map<string, TokenInfo[]>()),
];
