import { attempt } from "./log";

/** Creates or replaces a `<style>` owned by RxE. */
export function injectStyle(id: string, css: string): () => void {
  let style = document.querySelector<HTMLStyleElement>(`style[data-rxe="${id}"]`);
  if (!style) {
    style = document.createElement("style");
    style.dataset.rxe = id;
    (document.head ?? document.documentElement).append(style);
  }
  style.textContent = css;
  const owned = style;
  return () => owned.remove();
}

type Decorator = (element: Element) => (() => void) | void;

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
  observer ??= new MutationObserver(scanAll);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scan(watcher);
  return () => {
    watchers.delete(watcher);
    watcher.cleanups.forEach((cleanup) => attempt("dom cleanup", cleanup));
    watcher.cleanups.clear();
    if (watchers.size === 0) {
      observer?.disconnect();
      observer = undefined;
    }
  };
}
