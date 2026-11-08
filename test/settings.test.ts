import { expect, test } from "bun:test";
import { readSettings, setting, settingsStore, writeSetting } from "../src/core/settings";

const schema = {
  enabled: setting.boolean({ label: "Enabled", default: true }),
  style: setting.select({
    label: "Style",
    options: [
      { value: "ring", label: "Ring" },
      { value: "glow", label: "Glow" },
    ],
    default: "ring",
  }),
  width: setting.number({ label: "Width", min: 1, max: 4, step: 1, default: 2 }),
};

test("defaults apply until a value is saved", () => {
  expect(readSettings("demo", schema)).toEqual({ enabled: true, style: "ring", width: 2 });
  writeSetting("demo", "style", "glow");
  expect(readSettings("demo", schema).style).toBe("glow");
});

test("saved values that no longer fit the schema fall back to defaults", () => {
  settingsStore.setState({ values: { demo: { enabled: "yes", style: "dashed", width: 99 } } });
  expect(readSettings("demo", schema)).toEqual({ enabled: true, style: "ring", width: 2 });
});
