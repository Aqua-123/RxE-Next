import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import type { Scope } from "./scope";

interface Common {
  label: string;
  description?: string;
}

export interface BooleanSetting extends Common {
  kind: "boolean";
  default: boolean;
}

export interface SelectSetting<V extends string = string> extends Common {
  kind: "select";
  options: readonly { value: V; label: string }[];
  default: NoInfer<V>;
}

export interface NumberSetting extends Common {
  kind: "number";
  min: number;
  max: number;
  step: number;
  unit?: string;
  default: number;
}

export interface TextSetting extends Common {
  kind: "text";
  placeholder?: string;
  multiline?: boolean;
  default: string;
}

export type SettingDefinition = BooleanSetting | SelectSetting | NumberSetting | TextSetting;
export type SettingsSchema = Record<string, SettingDefinition>;

/** Declares a feature setting. The settings panel renders a control for it automatically. */
export const setting = {
  boolean: (options: Omit<BooleanSetting, "kind">): BooleanSetting => ({
    kind: "boolean",
    ...options,
  }),
  select: <const V extends string>(options: Omit<SelectSetting<V>, "kind">): SelectSetting<V> => ({
    kind: "select",
    ...options,
  }),
  number: (options: Omit<NumberSetting, "kind">): NumberSetting => ({ kind: "number", ...options }),
  text: (options: Omit<TextSetting, "kind">): TextSetting => ({ kind: "text", ...options }),
};

export type SettingValue<D extends SettingDefinition> =
  D extends SelectSetting<infer V>
    ? V
    : D extends BooleanSetting
      ? boolean
      : D extends NumberSetting
        ? number
        : string;

export type SettingValues<S extends SettingsSchema> = {
  readonly [K in keyof S]: SettingValue<S[K]>;
};

/** Every feature's saved values, keyed by feature id. One store, so backups are one document. */
export const settingsStore = createStore<{ values: Record<string, Record<string, unknown>> }>()(
  persist(() => ({ values: {} }), { name: "rxe-next:settings", version: 1 })
);

/** A saved value only counts if it still fits the definition; otherwise the default applies. */
function validValue(definition: SettingDefinition, value: unknown): unknown {
  switch (definition.kind) {
    case "boolean":
      return typeof value === "boolean" ? value : definition.default;
    case "number":
      return typeof value === "number" && value >= definition.min && value <= definition.max
        ? value
        : definition.default;
    case "select":
      return definition.options.some((option) => option.value === value)
        ? value
        : definition.default;
    case "text":
      return typeof value === "string" ? value : definition.default;
  }
}

export function readSettings<S extends SettingsSchema>(
  featureId: string,
  schema: S
): SettingValues<S> {
  const saved = settingsStore.getState().values[featureId] ?? {};
  return Object.fromEntries(
    Object.entries(schema).map(([key, definition]) => [key, validValue(definition, saved[key])])
  ) as SettingValues<S>;
}

export function writeSetting(featureId: string, key: string, value: unknown): void {
  settingsStore.setState(({ values }) => ({
    values: { ...values, [featureId]: { ...values[featureId], [key]: value } },
  }));
}

export interface SettingsApi<S extends SettingsSchema> {
  get(): SettingValues<S>;
  set<K extends keyof S & string>(key: K, value: SettingValue<S[K]>): void;
  /** Calls `listener` now and whenever this feature's settings change. */
  watch(listener: (values: SettingValues<S>) => void): void;
}

export function scopedSettings<S extends SettingsSchema>(
  scope: Scope,
  featureId: string,
  schema: S
): SettingsApi<S> {
  return {
    get: () => readSettings(featureId, schema),
    set: (key, value) => writeSetting(featureId, key, value),
    watch(listener) {
      let previous = settingsStore.getState().values[featureId];
      listener(readSettings(featureId, schema));
      scope.add(
        settingsStore.subscribe((state) => {
          const next = state.values[featureId];
          if (next === previous) return;
          previous = next;
          listener(readSettings(featureId, schema));
        })
      );
    },
  };
}
