import { beforeAll, describe, expect, test } from "bun:test";
import { exposeToPatches, installWebpackTap, patchReport, registerPatches } from "../src/platform/webpack";

const GLOBAL = "webpackChunk_test";

/** Module factories are built from exact source text, as they arrive from the site's minified chunks. */
const factory = (source: string): Function => (0, eval)(`(${source})`);

/** A minimal model of webpack's JSONP runtime: read push as parent, then replace it. */
function bootWebpackRuntime() {
  const registry: Record<string, Function> = {};
  const chunks = (globalThis as Record<string, any>)[GLOBAL] as unknown[];
  const callback = (parentPush: Function, entry: [unknown[], Record<string, Function>]) => {
    Object.assign(registry, entry[1]);
    parentPush(entry);
  };
  chunks.forEach((entry) => callback(() => {}, entry as never));
  chunks.push = callback.bind(null, chunks.push.bind(chunks)) as never;
  const run = (id: string) => {
    const module = { exports: {} as any };
    registry[id]!(module, module.exports, () => {});
    return module.exports;
  };
  return { run };
}

const push = (modules: Record<string, Function>) =>
  ((globalThis as Record<string, any>)[GLOBAL] as unknown[]).push([[1], modules]);

beforeAll(() => {
  registerPatches("greeter", [
    ...["greeting-early", "greeting-late", "greeting-short"].map((marker) => ({
      find: `"${marker}"`,
      replace: { match: /return"(\w+)"/, with: 'return $self.decorate("$1")' },
    })),
    { find: '"never-matches"', replace: { match: /nope/, with: "x" } },
    { find: '"half-broken"', replace: [{ match: /value=1/, with: "value=2" }, { match: /missing/, with: "x" }] },
    { find: '"minified-ids"', replace: { match: /(\i)\.exports\.n=(\i)/, with: "$1.exports.n=$2*10" } },
  ]);
  exposeToPatches("greeter", { decorate: (word: string) => `✨${word}✨` });
  installWebpackTap(GLOBAL);
});

describe("webpack tap", () => {
  test("patches chunks pushed before the runtime loads", () => {
    push({ early: factory('function(e){"greeting-early";e.exports.greet=function(){return"early"}}') });
    const { run } = bootWebpackRuntime();
    expect(run("early").greet()).toBe("✨early✨");
  });

  test("patches chunks pushed after the runtime took over push (lazy chunks)", () => {
    const { run } = bootWebpackRuntime();
    push({ late: factory('function(e){"greeting-late";e.exports.greet=()=>{return"late"}}') });
    expect(run("late").greet()).toBe("✨late✨");
  });

  test("\\i matches minified identifiers", () => {
    const { run } = bootWebpackRuntime();
    push({ ids: factory('function(e,t,n){"minified-ids";let r=4;e.exports.n=r}') });
    expect(run("ids").n).toBe(40);
  });

  test("handles method-shorthand factories", () => {
    const { run } = bootWebpackRuntime();
    // Object-literal method: String() yields `123(e){…}`, which is not an expression on its own.
    const shorthand = factory('{123(e){"greeting-short";e.exports.greet=()=>{return"short"}}}[123]'.replace(/^/, "(").replace(/\[123\]$/, ")[123]"));
    push({ short: shorthand });
    expect(run("short").greet()).toBe("✨short✨");
  });

  test("leaves unrelated modules untouched", () => {
    const original = factory("function(e){e.exports.value=1}");
    const modules = { plain: original };
    push(modules);
    expect(modules.plain).toBe(original);
  });

  test("reports patches that stop matching and keeps the original module", () => {
    const { run } = bootWebpackRuntime();
    push({ broken: factory('function(e){"half-broken";e.exports.value=1}') });
    expect(run("broken").value).toBe(1);
    const report = patchReport();
    expect(report.find((entry) => entry.find.includes("half-broken"))?.status).toEqual({
      kind: "match-missed",
      moduleId: "broken",
      replacement: 1,
    });
    expect(report.find((entry) => entry.find.includes("never-matches"))?.status.kind).toBe("pending");
  });
});
