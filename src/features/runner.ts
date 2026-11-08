import { signal } from "@preact/signals";
import { store } from "../core/storage";
import { siteContext } from "../platform/bridge";
import { cable } from "../platform/cable";
import { attempt, log } from "../platform/log";
import { currentPath } from "../platform/route";
import type { Capability, Feature, Teardown } from "./feature";

const CAPABILITIES: Record<Capability, () => boolean> = {
  cable: () => cable.attached,
  bridge: () => siteContext("auth") !== undefined,
};

export type FeatureState =
  | { kind: "running" }
  | { kind: "off" }
  | { kind: "waiting"; reason: string }
  | { kind: "error"; message: string };

export interface FeatureStatus {
  id: string;
  name: string;
  description: string;
  locked: boolean;
  enabled: boolean;
  state: FeatureState;
}

interface Slot {
  feature: Feature;
  teardown?: Teardown;
  state: FeatureState;
}

const slots = new Map<string, Slot>();

/** Live view of every feature, for UI. Updated whenever a feature starts, stops, or is toggled. */
export const featureStatuses = signal<readonly FeatureStatus[]>([]);

const enabledKey = (feature: Feature) => `feature:${feature.id}`;

function isEnabled(feature: Feature): boolean {
  return feature.locked || store.get(enabledKey(feature), feature.defaultEnabled);
}

function publish(): void {
  featureStatuses.value = [...slots.values()].map(({ feature, state }) => ({
    id: feature.id,
    name: feature.name,
    description: feature.description,
    locked: feature.locked ?? false,
    enabled: isEnabled(feature),
    state,
  }));
}

function desiredState(feature: Feature): FeatureState {
  if (!isEnabled(feature)) return { kind: "off" };
  if (feature.routes && !feature.routes.test(currentPath()))
    return { kind: "waiting", reason: "not used on this page" };
  const missing = feature.requires.find((capability) => !CAPABILITIES[capability]());
  if (missing) return { kind: "waiting", reason: `waiting for ${missing}` };
  return { kind: "running" };
}

function stop(slot: Slot): void {
  if (!slot.teardown) return;
  attempt(`${slot.feature.id} teardown`, slot.teardown);
  slot.teardown = undefined;
}

function start(slot: Slot): FeatureState {
  try {
    slot.teardown = slot.feature.setup() ?? (() => {});
    return { kind: "running" };
  } catch (error) {
    log.error(`${slot.feature.id} failed to start`, error);
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

/** Starts and stops features to match settings, route, and available capabilities. Idempotent. */
export function evaluateFeatures(): void {
  for (const slot of slots.values()) {
    const desired = desiredState(slot.feature);
    if (desired.kind !== "running") {
      stop(slot);
      slot.state = desired;
    } else if (slot.state.kind !== "error" && !slot.teardown) {
      slot.state = start(slot);
    }
  }
  publish();
}

export function registerFeatures(features: readonly Feature[]): void {
  for (const feature of features) {
    slots.set(feature.id, { feature, state: { kind: "off" } });
  }
  publish();
}

export function setFeatureEnabled(id: string, enabled: boolean): void {
  const slot = slots.get(id);
  if (!slot || slot.feature.locked) return;
  store.set(enabledKey(slot.feature), enabled);
  // Re-enabling is the way to retry a feature that errored.
  if (enabled && slot.state.kind === "error") slot.state = { kind: "off" };
  evaluateFeatures();
}
