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

/** The token-based rewrite of one style rule's hardcoded colors, or null if there are none. */
export function tokenizeRule(selector: string, style: StyleLike, index: TokenIndex): string | null {
  const declarations: string[] = [];
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
    declarations.push(`${property}:var(--${token.name})${important}`);
  }
  return declarations.length ? `${selector}{${declarations.join(";")}}` : null;
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
