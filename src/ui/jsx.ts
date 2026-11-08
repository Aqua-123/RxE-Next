import type ReactNamespace from "react";
import { siteReact } from "../platform/modules";

/** RxE UI renders with the site's React so it can live inside the site's tree (popups, portals). */
export function react(): typeof ReactNamespace {
  const instance = siteReact();
  if (!instance) throw new Error("The site's React is not available yet");
  return instance;
}

export const h = ((...args: Parameters<typeof ReactNamespace.createElement>) =>
  react().createElement(...args)) as typeof ReactNamespace.createElement;

export const Fragment = Symbol.for("react.fragment") as unknown as typeof ReactNamespace.Fragment;
