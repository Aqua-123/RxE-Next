import { expect, test } from "bun:test";
import { Pipeline, Scope } from "../src/core/scope";

test("pipelines run in feature order, whatever order features started in", () => {
  const pipeline = new Pipeline<string>();
  const late = pipeline.add(new Scope("late", 2), "late");
  pipeline.add(new Scope("early", 0), "early");
  pipeline.add(new Scope("middle", 1), "middle");
  expect([...pipeline]).toEqual(["early", "middle", "late"]);
  late();
  expect([...pipeline]).toEqual(["early", "middle"]);
});
