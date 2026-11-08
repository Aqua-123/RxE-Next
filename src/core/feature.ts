import type { Patch } from "@/platform/webpack";
import type { FeatureContext } from "@/site/context";
import type { User } from "@/site/model";
import type { SettingsSchema } from "./settings";

export type FeatureCategory = "chat" | "appearance" | "profiles" | "moderation" | "utility";

export interface Environment {
  /** Current path without trailing slash, e.g. `/app/meet/group-chat`. */
  path: string;
  /** The signed-in user, once the site has loaded it. */
  user: User | null;
}

export interface FeatureDefinition<S extends SettingsSchema = SettingsSchema> {
  id: string;
  name: string;
  description: string;
  category: FeatureCategory;
  /** Defaults to true. */
  enabledByDefault?: boolean;
  /** Always on and hidden from settings (RxE's own plumbing, e.g. the settings entry point). */
  core?: boolean;
  /** Rendered as controls in the settings panel; typed values arrive as `context.settings`. */
  settings?: S;
  /** Re-evaluated on navigation and when the user loads. */
  when?: (env: Environment) => boolean;
  /**
   * Raw module patches for changes no surface covers yet. Applied while the site's
   * chunks load, so they only take effect if the feature was enabled at page load.
   */
  patches?: readonly Patch[];
  /** Everything registered through `context` is undone when the feature stops. */
  setup(context: FeatureContext<S>): PatchSelf | undefined;
}

/** What a feature's raw patches reach through `$self`. */
export type PatchSelf = Record<string, unknown>;

// biome-ignore lint/complexity/noBannedTypes: `{}` is the empty settings schema.
export function defineFeature<S extends SettingsSchema = {}>(
  feature: FeatureDefinition<S>
): FeatureDefinition<S> {
  return feature;
}

/** A feature of any settings shape, as the runtime stores them. */
// biome-ignore lint/suspicious/noExplicitAny: settings types are erased once registered.
export type AnyFeature = FeatureDefinition<any>;
