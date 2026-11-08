import css from "./styles/rxe.tailwind.css";

const sheet = new CSSStyleSheet();
sheet.replaceSync(css);

function collectPropertyRules(rules: CSSRuleList, into: string[]): string[] {
  for (const rule of rules) {
    if (rule instanceof CSSPropertyRule) into.push(rule.cssText);
    else if ("cssRules" in rule) collectPropertyRules((rule as CSSGroupingRule).cssRules, into);
  }
  return into;
}

let propertiesRegistered = false;

/**
 * Browsers ignore `@property` inside shadow roots, and Tailwind's shadow, ring and
 * transform utilities depend on those registrations. Registering them on the
 * document is global and styles nothing on the site.
 */
function registerPropertiesOnDocument(): void {
  if (propertiesRegistered) return;
  propertiesRegistered = true;
  const properties = new CSSStyleSheet();
  properties.replaceSync(collectPropertyRules(sheet.cssRules, []).join("\n"));
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, properties];
}

/** Gives a shadow root RxE's stylesheet. */
export function adoptRxeStyles(root: ShadowRoot): void {
  registerPropertiesOnDocument();
  if (!root.adoptedStyleSheets.includes(sheet)) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
  }
}
