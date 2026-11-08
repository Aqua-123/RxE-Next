import { attempt } from "./log";

/*
 * RxE starts at document_start, when `document.documentElement` may not exist yet.
 * Everything here works against `document` itself, which always does.
 */

const styles = new Map<string, CSSStyleSheet>();

/**
 * Creates or replaces a stylesheet RxE applies to the site. Adopted stylesheets
 * need no DOM node, and they win cascade ties against the site's own sheets.
 */
export function injectStyle(id: string, css: string): () => void {
  let sheet = styles.get(id);
  if (!sheet) {
    sheet = new CSSStyleSheet();
    styles.set(id, sheet);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }
  sheet.replaceSync(css);
  const owned = sheet;
  return () => {
    if (styles.get(id) !== owned) return;
    styles.delete(id);
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter(
      (adopted) => adopted !== owned
    );
  };
}

type Decorator = (element: Element) => (() => void) | undefined;

interface Watcher {
  selector: string;
  decorate: Decorator;
  cleanups: Map<Element, () => void>;
}

const watchers = new Set<Watcher>();
let observer: MutationObserver | undefined;

function scan(watcher: Watcher): void {
  for (const [element, cleanup] of watcher.cleanups) {
    if (!element.isConnected) {
      attempt("dom cleanup", cleanup);
      watcher.cleanups.delete(element);
    }
  }
  for (const element of document.querySelectorAll(watcher.selector)) {
    if (watcher.cleanups.has(element)) continue;
    const cleanup = attempt("dom decorator", () => watcher.decorate(element));
    watcher.cleanups.set(element, cleanup ?? (() => {}));
  }
}

/** Mutation callbacks run as microtasks before paint, so decorations never appear a frame late. */
function scanAll(): void {
  watchers.forEach(scan);
}

/**
 * Runs `decorate` once for every element matching `selector`, now and as the site
 * re-renders. Decorations are cleaned up when their element leaves the DOM or the
 * returned stop function is called.
 */
export function watch(selector: string, decorate: Decorator): () => void {
  const watcher: Watcher = { selector, decorate, cleanups: new Map() };
  watchers.add(watcher);
  if (!observer) {
    observer = new MutationObserver(scanAll);
    observer.observe(document, { childList: true, subtree: true });
  }
  scan(watcher);
  return () => {
    watchers.delete(watcher);
    for (const cleanup of watcher.cleanups.values()) attempt("dom cleanup", cleanup);
    watcher.cleanups.clear();
    if (watchers.size === 0) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}
