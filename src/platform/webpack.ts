import { log } from "./log";

type ModuleFactory = (module: { exports: unknown }, exports: unknown, require: unknown) => void;
type ChunkEntry = [chunkIds: unknown[], modules: Record<string, ModuleFactory>, runtime?: unknown];

export interface Replacement {
  /** `\i` matches one minified identifier. */
  match: RegExp;
  /** `$self` is the owner's patch object, `$rxe` the surface registry; `$1`… are capture groups. */
  with: string;
}

export interface Patch {
  /** Text or pattern that identifies exactly one module factory by its source. */
  find: string | RegExp;
  replace: Replacement | readonly Replacement[];
}

export type PatchStatus =
  | { kind: "pending" }
  | { kind: "applied"; moduleIds: string[] }
  | { kind: "match-missed"; moduleId: string; replacement: number }
  | { kind: "failed"; moduleId: string; error: string };

interface PatchRecord {
  owner: string;
  patch: Patch;
  replacements: readonly Replacement[];
  status: PatchStatus;
}

const IDENTIFIER = String.raw`(?:[A-Za-z_$][\w$]*)`;
const GLOBAL = "__RXE__";

const records: PatchRecord[] = [];
const processedChunks = new WeakSet<object>();

interface Exposed {
  self: Record<string, unknown>;
  surfaces: Record<string, unknown>;
}

/** What patched code reaches through `$self` and `$rxe`. Created on first use, never at import. */
function exposed(): Exposed {
  const target = globalThis as unknown as Record<string, Exposed>;
  if (!target[GLOBAL]) {
    Object.defineProperty(globalThis, GLOBAL, { value: { self: {}, surfaces: {} } });
  }
  return target[GLOBAL]!;
}

export function exposeToPatches(owner: string, self: unknown): void {
  exposed().self[owner] = self;
}

export function exposeSurface(name: string, surface: unknown): void {
  exposed().surfaces[name] = surface;
}

/** Must be called before the site's chunks load, i.e. synchronously during boot. */
export function registerPatches(owner: string, patches: readonly Patch[]): void {
  for (const patch of patches) {
    const replacements = Array.isArray(patch.replace) ? patch.replace : [patch.replace as Replacement];
    records.push({ owner, patch, replacements, status: { kind: "pending" } });
  }
}

export function patchReport(): ReadonlyArray<{ owner: string; find: string; status: PatchStatus }> {
  return records.map(({ owner, patch, status }) => ({ owner, find: String(patch.find), status }));
}

function expandMatch(match: RegExp): RegExp {
  return new RegExp(match.source.replaceAll(String.raw`\i`, IDENTIFIER), match.flags);
}

function expandReplacement(owner: string, text: string): string {
  return text
    .replaceAll("$self", `globalThis.${GLOBAL}.self[${JSON.stringify(owner)}]`)
    .replaceAll("$rxe", `globalThis.${GLOBAL}.surfaces`);
}

function matchesFind(find: Patch["find"], source: string): boolean {
  return typeof find === "string" ? source.includes(find) : find.test(source);
}

/** Webpack emits factories as `function(e,t,n){…}`; method shorthand (`123(e,t,n){…}`) is not an expression. */
function asExpression(source: string): string {
  if (/^(function\b|async\b|\(|[\w$]+\s*=>)/.test(source)) return source;
  return source.replace(/^[\w$]+\s*(?=\()/, "function");
}

function patchFactory(moduleId: string, factory: ModuleFactory): ModuleFactory {
  const source = String(factory);
  const applicable = records.filter(
    (record) => record.status.kind !== "applied" && matchesFind(record.patch.find, source)
  );
  if (applicable.length === 0) return factory;

  let code = source;
  for (const record of applicable) {
    let missed = -1;
    let next = code;
    record.replacements.forEach((replacement, index) => {
      const replaced = next.replace(expandMatch(replacement.match), expandReplacement(record.owner, replacement.with));
      if (replaced === next && missed < 0) missed = index;
      next = replaced;
    });
    if (missed >= 0) {
      record.status = { kind: "match-missed", moduleId, replacement: missed };
      log.warn(`Patch from ${record.owner} no longer matches module ${moduleId}`, record.patch.find);
      continue;
    }
    code = next;
    record.status = { kind: "applied", moduleIds: [moduleId] };
  }
  if (code === source) return factory;

  try {
    // Indirect eval: the module runs in global scope, exactly as webpack would run it.
    return (0, eval)(`(${asExpression(code)})\n//# sourceURL=rxe-patched/${moduleId}.js`);
  } catch (error) {
    for (const record of applicable) {
      if (record.status.kind === "applied") {
        record.status = { kind: "failed", moduleId, error: String(error) };
      }
    }
    log.error(`Patched module ${moduleId} failed to compile; using the original`, error);
    return factory;
  }
}

function patchChunk(entry: unknown): void {
  if (!Array.isArray(entry) || processedChunks.has(entry)) return;
  processedChunks.add(entry);
  const modules = (entry as ChunkEntry)[1];
  if (!modules || typeof modules !== "object" || records.length === 0) return;
  for (const id of Object.keys(modules)) {
    const factory = modules[id];
    if (typeof factory === "function") modules[id] = patchFactory(id, factory);
  }
}

/**
 * Owns `self.webpackChunk_N_E` before Next's runtime loads. Every chunk (initial
 * and lazily loaded) is pushed through it, so module factories are patched before
 * webpack ever runs them.
 *
 * Webpack's runtime reads `push` (keeping it as its parent) and then assigns its
 * own callback. The setter wraps that callback; until then, `push` patches and
 * queues entries for the runtime to drain.
 */
export function installWebpackTap(chunkGlobal = "webpackChunk_N_E"): void {
  const target = globalThis as Record<string, unknown>;
  const chunks = (Array.isArray(target[chunkGlobal]) ? target[chunkGlobal] : []) as unknown[];
  chunks.forEach(patchChunk);

  const queue = (...entries: unknown[]) => {
    entries.forEach(patchChunk);
    return Array.prototype.push.apply(chunks, entries);
  };
  let current: (...entries: unknown[]) => number = queue;

  Object.defineProperty(chunks, "push", {
    configurable: true,
    get: () => current,
    set(runtimePush: (...entries: unknown[]) => number) {
      current = (...entries) => {
        entries.forEach(patchChunk);
        return runtimePush.apply(chunks, entries);
      };
    },
  });
  target[chunkGlobal] = chunks;
}
