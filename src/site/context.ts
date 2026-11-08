import type { ReactNode } from "react";
import type { Scope } from "@/core/scope";
import { log } from "@/platform/log";
import { scopedOverlay } from "@/ui/overlay";
import { scopedSite, type SiteApi } from "./api";
import { scopedAccountMenu, type AccountMenuApi } from "./surfaces/accountMenu";
import { scopedChat, type ChatApi } from "./surfaces/chat";
import { scopedMessages, type MessagesApi } from "./surfaces/messages";

/** Everything a feature can touch. Every registration is tied to the feature's scope. */
export interface FeatureContext {
  chat: ChatApi;
  messages: MessagesApi;
  ui: {
    accountMenu: AccountMenuApi;
    /** Mounts page-level UI (dialogs, panels) inside an RxE shadow root. */
    overlay(node: ReactNode): void;
  };
  site: SiteApi;
  log: typeof log;
}

export function createFeatureContext(scope: Scope): FeatureContext {
  return {
    chat: scopedChat(scope),
    messages: scopedMessages(scope),
    ui: { accountMenu: scopedAccountMenu(scope), overlay: scopedOverlay(scope) },
    site: scopedSite(scope),
    log,
  };
}
