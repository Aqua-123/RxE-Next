import { createStore } from "zustand/vanilla";
import { log } from "@/platform/log";
import { exposeToPatches, registerPatches } from "@/platform/webpack";
import { createFeatureContext } from "@/site/context";
import type { Environment, FeatureDefinition } from "./feature";
import { Scope } from "./scope";
import { store } from "./storage";

export type FeatureState =
  | { kind: "running" }
  | { kind: "off" }
  | { kind: "inactive" }
  | { kind: "reload-required" }
  | { kind: "error"; message: string };

export interface FeatureStatus {
  id: string;
  name: string;
  description: string;
  category: FeatureDefinition["category"];
  core: boolean;
  enabled: boolean;
  state: FeatureState;
}

interface Slot {
  feature: FeatureDefinition;
  scope?: Scope;
  state: FeatureState;
  /** Whether the feature's raw patches were registered at boot. */
  patched: boolean;
}

const slots = new Map<string, Slot>();
let environment: Environment = { path: "/", user: null };

/** Live view of every feature, for UI. */
export const featureStatuses = createStore<readonly FeatureStatus[]>(() => []);

const enabledKey = (feature: FeatureDefinition) => `feature:${feature.id}`;

function isEnabled(feature: FeatureDefinition): boolean {
  return feature.core || store.get(enabledKey(feature), feature.enabledByDefault ?? true);
}

function publish(): void {
  featureStatuses.setState(
    [...slots.values()].map(({ feature, state }) => ({
      id: feature.id,
      name: feature.name,
      description: feature.description,
      category: feature.category,
      core: feature.core ?? false,
      enabled: isEnabled(feature),
      state,
    })),
    true
  );
}

function desiredState(slot: Slot): FeatureState {
  const { feature } = slot;
  if (!isEnabled(feature)) return { kind: "off" };
  if (feature.patches?.length && !slot.patched) return { kind: "reload-required" };
  if (feature.when && !feature.when(environment)) return { kind: "inactive" };
  return { kind: "running" };
}

function start(slot: Slot): FeatureState {
  const scope = new Scope(slot.feature.id);
  try {
    const self = slot.feature.setup(createFeatureContext(scope));
    if (self) exposeToPatches(slot.feature.id, self);
    slot.scope = scope;
    return { kind: "running" };
  } catch (error) {
    scope.dispose();
    log.error(`${slot.feature.id} failed to start`, error);
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

function stop(slot: Slot): void {
  slot.scope?.dispose();
  slot.scope = undefined;
}

/** Starts and stops features to match settings and the environment. Idempotent. */
function evaluate(): void {
  for (const slot of slots.values()) {
    const desired = desiredState(slot);
    if (desired.kind !== "running") {
      stop(slot);
      slot.state = desired;
    } else if (slot.state.kind !== "error" && !slot.scope) {
      slot.state = start(slot);
    }
  }
  publish();
}

/**
 * Registers features and, for those enabled right now, their raw patches. Must run
 * synchronously at boot, before the site's chunks load.
 */
export function registerFeatures(features: readonly FeatureDefinition[]): void {
  for (const feature of features) {
    const patched = Boolean(feature.patches?.length) && isEnabled(feature);
    if (patched) registerPatches(feature.id, feature.patches!);
    slots.set(feature.id, { feature, state: { kind: "off" }, patched });
  }
  publish();
}

export function updateEnvironment(next: Partial<Environment>): void {
  environment = { ...environment, ...next };
  evaluate();
}

export function setFeatureEnabled(id: string, enabled: boolean): void {
  const slot = slots.get(id);
  if (!slot || slot.feature.core) return;
  store.set(enabledKey(slot.feature), enabled);
  // Re-enabling is the way to retry a feature that errored.
  if (enabled && slot.state.kind === "error") slot.state = { kind: "off" };
  evaluate();
}
