import css from "./styles/rxe.tailwind.css";

const base = new CSSStyleSheet();
base.replaceSync(css);

/** Stylesheets generated at runtime (theme previews), adopted alongside the base sheet. */
const generated = new Map<string, CSSStyleSheet>();
const roots = new Set<ShadowRoot>();

function adopt(root: ShadowRoot): void {
  root.adoptedStyleSheets = [base, ...generated.values()];
}

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
  properties.replaceSync(collectPropertyRules(base.cssRules, []).join("\n"));
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, properties];
}

/** Gives a shadow root RxE's stylesheets. Returns a release function for when it unmounts. */
export function adoptRxeStyles(root: ShadowRoot): () => void {
  registerPropertiesOnDocument();
  roots.add(root);
  adopt(root);
  return () => {
    roots.delete(root);
  };
}

/**
 * Sets CSS generated from data (for example, per-theme preview colors) in every RxE
 * shadow root. This is how dynamic colors reach components without inline styles.
 */
export function setGeneratedStyles(id: string, text: string): void {
  let sheet = generated.get(id);
  const added = !sheet;
  sheet ??= new CSSStyleSheet();
  sheet.replaceSync(text);
  if (added) {
    generated.set(id, sheet);
    roots.forEach(adopt);
  }
}
