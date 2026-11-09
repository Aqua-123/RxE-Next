import type { ReactNode } from "react";
import type { AnyFeature } from "@/core/feature";
import type { Scope } from "@/core/scope";
import { type SettingsApi, type SettingsSchema, scopedSettings } from "@/core/settings";
import { injectStyle } from "@/platform/dom";
import { attempt, log } from "@/platform/log";
import { scopedOverlay } from "@/ui/overlay";
import { type SiteApi, scopedSite } from "./api";
import { type AccountMenuApi, scopedAccountMenu } from "./surfaces/accountMenu";
import { type ChatApi, scopedChat } from "./surfaces/chat";
import { type ComposerApi, scopedComposer } from "./surfaces/composer";
import { type MessagesApi, scopedMessages } from "./surfaces/messages";

/** Everything a feature can touch. Every registration is tied to the feature's scope. */
export interface FeatureContext<S extends SettingsSchema = SettingsSchema> {
  settings: SettingsApi<S>;
  chat: ChatApi;
  composer: ComposerApi;
  messages: MessagesApi;
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
  /** Runs `callback` after `ms` unless the feature stops first. Returns a cancel function. */
  after(ms: number, callback: () => void): () => void;
  log: typeof log;
}

function scopedAfter(scope: Scope): FeatureContext["after"] {
  const pending = new Set<ReturnType<typeof setTimeout>>();
  scope.add(() => {
    for (const timer of pending) clearTimeout(timer);
  });
  return (ms, callback) => {
    const timer = setTimeout(() => {
      pending.delete(timer);
      attempt(`${scope.owner} timer`, callback);
    }, ms);
    pending.add(timer);
    return () => {
      clearTimeout(timer);
      pending.delete(timer);
    };
  };
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
    composer: scopedComposer(scope),
    messages: scopedMessages(scope),
    ui: {
      accountMenu: scopedAccountMenu(scope),
      overlay: scopedOverlay(scope),
      siteStyle: scopedSiteStyle(scope),
    },
    site: scopedSite(scope),
    after: scopedAfter(scope),
    log,
  };
}
