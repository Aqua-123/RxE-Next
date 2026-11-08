import type ReactNamespace from "react";

interface WebpackRequire {
  (id: number | string): unknown;
  c: Record<string, { exports: unknown }>;
}

/** Deterministic module id derived from the package path; stable across the site's builds. */
const REACT_MODULE_ID = 67294;

let cachedRequire: WebpackRequire | undefined;

/** The site's webpack loader, obtained by pushing a no-op chunk whose runtime callback receives it. */
function webpackRequire(): WebpackRequire | undefined {
  if (cachedRequire) return cachedRequire;
  const chunks = (globalThis as { webpackChunk_N_E?: unknown[] }).webpackChunk_N_E;
  if (!Array.isArray(chunks)) return undefined;
  chunks.push([
    [Symbol("rxe")],
    {},
    (require: WebpackRequire) => {
      cachedRequire = require;
    },
  ]);
  return cachedRequire;
}

function isReact(candidate: unknown): candidate is SiteReact {
  const react = candidate as Partial<SiteReact> | null;
  return (
    typeof react?.createElement === "function" && typeof react.useSyncExternalStore === "function"
  );
}

/** The site's own React (18). Only for components that must render inside the site's tree. */
export type SiteReact = typeof ReactNamespace;

let cachedReact: SiteReact | undefined;

export function siteReact(): SiteReact | undefined {
  if (cachedReact) return cachedReact;
  const require = webpackRequire();
  if (!require) return undefined;
  let known: unknown;
  try {
    known = require(REACT_MODULE_ID);
  } catch {
    known = undefined;
  }
  cachedReact = isReact(known)
    ? known
    : Object.values(require.c)
        .map((module) => module.exports)
        .find(isReact);
  return cachedReact;
}
