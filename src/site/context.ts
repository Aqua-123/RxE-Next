import type { ReactNode } from "react";
import type { AnyFeature } from "@/core/feature";
import type { Scope } from "@/core/scope";
import { type SettingsApi, type SettingsSchema, scopedSettings } from "@/core/settings";
import { injectStyle } from "@/platform/dom";
import { log } from "@/platform/log";
import { scopedOverlay } from "@/ui/overlay";
import { type SiteApi, scopedSite } from "./api";
import { type AccountMenuApi, scopedAccountMenu } from "./surfaces/accountMenu";
import { type ChatApi, scopedChat } from "./surfaces/chat";
import { type MessagesApi, scopedMessages } from "./surfaces/messages";
import { type ProfilesApi, scopedProfiles } from "./surfaces/profiles";

/** Everything a feature can touch. Every registration is tied to the feature's scope. */
export interface FeatureContext<S extends SettingsSchema = SettingsSchema> {
  settings: SettingsApi<S>;
  chat: ChatApi;
  messages: MessagesApi;
  profiles: ProfilesApi;
  ui: {
    accountMenu: AccountMenuApi;
    /** Mounts page-level UI (dialogs, panels) inside an RxE shadow root. */
    overlay(node: ReactNode): void;
    /**
     * Sets a stylesheet on the site (for classes surfaces expose, like avatar classes).
     * Calling again with the same id replaces it. Colors must come from theme tokens.
     */
    siteStyle(id: string, css: string): void;
  };
  site: SiteApi;
  log: typeof log;
}

function scopedSiteStyle(scope: Scope): (id: string, css: string) => void {
  const removers = new Map<string, () => void>();
  scope.add(() => {
    for (const remove of removers.values()) remove();
  });
  return (id, css) => {
    removers.set(id, injectStyle(`feature:${scope.owner}:${id}`, css));
  };
}

export function createFeatureContext(scope: Scope, feature: AnyFeature): FeatureContext {
  return {
    settings: scopedSettings(scope, feature.id, feature.settings ?? {}),
    chat: scopedChat(scope),
    messages: scopedMessages(scope),
    profiles: scopedProfiles(scope),
    ui: {
      accountMenu: scopedAccountMenu(scope),
      overlay: scopedOverlay(scope),
      siteStyle: scopedSiteStyle(scope),
    },
    site: scopedSite(scope),
    log,
  };
}
