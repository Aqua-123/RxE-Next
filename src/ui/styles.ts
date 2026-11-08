/**
 * Every `*.module.css` registers its compiled CSS here when imported. All of it is
 * adopted into the document (for components mounted inside the site's DOM) and into
 * every RxE shadow root. Class names are hashed, so nothing leaks onto the site.
 */
const sheets = new Map<string, CSSStyleSheet>();
const roots = new Set<Document | ShadowRoot>([document]);

function adopt(root: Document | ShadowRoot): void {
  const ours = new Set(sheets.values());
  const foreign = root.adoptedStyleSheets.filter((sheet) => !ours.has(sheet));
  root.adoptedStyleSheets = [...foreign, ...ours];
}

export function registerStyles(id: string, css: string): void {
  const sheet = sheets.get(id) ?? new CSSStyleSheet();
  sheet.replaceSync(css);
  sheets.set(id, sheet);
  roots.forEach(adopt);
}

export function adoptStyles(root: ShadowRoot): () => void {
  roots.add(root);
  adopt(root);
  return () => {
    roots.delete(root);
  };
}
