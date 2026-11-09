import { SITE_TOKENS, type TokenRole } from "@/site/tokens";
import { normalize } from "./color";

/**
 * About a quarter of the site's color rules hardcode a value instead of using its
 * tokens. Most of those values *equal* a token's default, so they can be rewritten
 * to `var(--token)` generically, without knowing any selector, and the rewrite
 * survives site deploys.
 *
 * A token only replaces colors in properties that match its role, so a white used
 * as text follows the theme's text color while a white background stays put.
 */

const PROPERTIES_BY_ROLE: Record<TokenRole, readonly string[]> = {
  surface: [
    "background-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
  ],
  text: ["color", "fill", "stroke", "caret-color", "text-decoration-color"],
  accent: [
    "color",
    "background-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
    "outline-color",
    "fill",
    "stroke",
  ],
};

export type TokenIndex = ReadonlyMap<string, readonly { name: string; role: TokenRole }[]>;

/** Maps each default token value (the site's dark set, which its stylesheets use) to its tokens. */
export function buildTokenIndex(): TokenIndex {
  const index = new Map<string, { name: string; role: TokenRole }[]>();
  for (const token of SITE_TOKENS) {
    const key = normalize(token.dark);
    if (!key) continue;
    index.set(key, [...(index.get(key) ?? []), { name: token.name, role: token.role }]);
  }
  return index;
}

interface StyleLike {
  readonly length: number;
  item(index: number): string;
  getPropertyValue(property: string): string;
  getPropertyPriority(property: string): string;
}

const ACCENTS = new Set(
  SITE_TOKENS.filter((token) => token.role === "accent").map((token) => token.name)
);
const TOKEN_REFERENCE = /^var\(--([\w-]+)\)$/;

/** Text colors that mean "the theme's text color", which may not read on an accent background. */
const isDefaultText = (value: string) =>
  value === "" || /^var\(--primary-content(?:-\d+)?\)$/.test(value);

/**
 * The token-based rewrite of one style rule, or null if nothing changes:
 *   1. hardcoded colors equal to a token's default become `var(--token)`
 *   2. text on an accent background becomes that accent's readable `--rxe-on-*` color
 */
export function tokenizeRule(selector: string, style: StyleLike, index: TokenIndex): string | null {
  const declarations = new Map<string, string>();
  for (let i = 0; i < style.length; i += 1) {
    const property = style.item(i);
    const value = style.getPropertyValue(property).trim();
    if (!value || value.includes("var(")) continue;
    const candidates = index.get(normalize(value) ?? "");
    const token = candidates?.find((candidate) =>
      PROPERTIES_BY_ROLE[candidate.role].includes(property)
    );
    if (!token) continue;
    const important = style.getPropertyPriority(property) ? "!important" : "";
    declarations.set(property, `var(--${token.name})${important}`);
  }

  const background =
    declarations.get("background-color") ?? style.getPropertyValue("background-color").trim();
  const accent = TOKEN_REFERENCE.exec(background.replace("!important", ""))?.[1];
  if (accent && ACCENTS.has(accent) && isDefaultText(style.getPropertyValue("color").trim())) {
    declarations.set(
      "color",
      `var(--rxe-on-${accent})${style.getPropertyPriority("color") ? "!important" : ""}`
    );
  }

  if (declarations.size === 0) return null;
  return `${selector}{${[...declarations].map(([property, value]) => `${property}:${value}`).join(";")}}`;
}

/** Rewrites every rule in a stylesheet, keeping `@media`/`@supports` wrappers. */
export function tokenizeRules(rules: CSSRuleList, index: TokenIndex): string {
  const output: string[] = [];
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) {
      const rewritten = tokenizeRule(rule.selectorText, rule.style, index);
      if (rewritten) output.push(rewritten);
    } else if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
      const inner = tokenizeRules(rule.cssRules, index);
      if (inner)
        output.push(
          `@${rule instanceof CSSMediaRule ? "media" : "supports"} ${rule.conditionText}{${inner}}`
        );
    }
  }
  return output.join("\n");
}
