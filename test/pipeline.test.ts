import { expect, test } from "bun:test";
import { Pipeline, Scope } from "../src/core/scope";

// The composer mounts RxE UI, whose styles need a DOM API bun doesn't have.
(globalThis as { CSSStyleSheet?: unknown }).CSSStyleSheet ??= class {
  replaceSync() {}
};
const { applyTransforms, scopedComposer } = await import("../src/site/surfaces/composer");

test("pipelines run in feature order, whatever order features started in", () => {
  const pipeline = new Pipeline<string>();
  const late = pipeline.add(new Scope("late", 2), "late");
  pipeline.add(new Scope("early", 0), "early");
  pipeline.add(new Scope("middle", 1), "middle");
  expect([...pipeline]).toEqual(["early", "middle", "late"]);
  late();
  expect([...pipeline]).toEqual(["early", "middle"]);
});

test("composer transforms chain in feature order and stop with their scope", () => {
  const styles = new Scope("text-styles", 2);
  const commands = new Scope("chat-commands", 0);
  scopedComposer(styles).transform((text) => text.toUpperCase());
  scopedComposer(commands).transform((text) => (text === ".shrug" ? "shrug" : undefined));

  expect(applyTransforms(".shrug")).toBe("SHRUG");
  commands.dispose();
  expect(applyTransforms(".shrug")).toBe(".SHRUG");
  styles.dispose();
  expect(applyTransforms(".shrug")).toBe(".shrug");
});
