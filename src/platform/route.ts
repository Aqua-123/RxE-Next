import { attempt } from "./log";

type RouteListener = (path: string) => void;

const listeners = new Set<RouteListener>();

/** The site uses trailing slashes (`/app/meet/`); RxE matches routes without them. */
export function currentPath(): string {
  return location.pathname.replace(/(.)\/$/, "$1");
}

let lastPath = "";

function notifyIfChanged(): void {
  const path = currentPath();
  if (path === lastPath) return;
  lastPath = path;
  listeners.forEach((listener) => attempt("route listener", () => listener(path)));
}

/** Next's client-side navigation goes through the History API, so patching it sees every route change. */
export function installRouteTap(): void {
  lastPath = currentPath();
  for (const method of ["pushState", "replaceState"] as const) {
    const native = history[method];
    history[method] = function patched(this: History, ...args: Parameters<History["pushState"]>) {
      native.apply(this, args);
      notifyIfChanged();
    };
  }
  addEventListener("popstate", notifyIfChanged);
}

export function onRouteChange(listener: RouteListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
