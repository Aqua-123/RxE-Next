import type ReactNamespace from "react";

interface WebpackRequire {
  (id: number | string): unknown;
  c: Record<string, { exports: unknown }>;
}

/** Deterministic module ids derived from package paths; stable across the site's builds. */
const REACT_MODULE_ID = 67294;

let cachedRequire: WebpackRequire | undefined;

/** The site's webpack loader, obtained by pushing a no-op chunk whose runtime callback receives it. */
export function webpackRequire(): WebpackRequire | undefined {
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

function isReact(candidate: unknown): candidate is typeof ReactNamespace {
  const react = candidate as Partial<typeof ReactNamespace> | null;
  return typeof react?.createElement === "function" && typeof react.useState === "function";
}

let cachedReact: typeof ReactNamespace | undefined;

/** The site's own React instance. RxE UI must use it to render inside the site's tree. */
export function siteReact(): typeof ReactNamespace | undefined {
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
