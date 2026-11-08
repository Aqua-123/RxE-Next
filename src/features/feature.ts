export type Capability = "cable" | "bridge";

export type Teardown = () => void;

export interface Feature {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  /** Hidden from the settings panel and always on. */
  locked?: boolean;
  /** Platform layers the feature needs. Missing ones keep it waiting instead of throwing. */
  requires: readonly Capability[];
  /** Paths (without trailing slash) the feature runs on. Omit to run everywhere. */
  routes?: RegExp;
  /** Starts the feature. The returned teardown must undo everything setup did. */
  setup(): Teardown | void;
}

export function defineFeature(feature: Feature): Feature {
  return feature;
}
