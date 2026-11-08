import type { ReactNode } from "react";
import type { AnyCableTransport } from "../platform/cable";

/** Shapes observed on the live site (Next.js 14.2, React 18.3). Only fields RxE reads are typed. */

export interface SiteUser {
  id: number;
  display_name: string;
  username: string;
  karma: number;
  gender: string;
  mod: boolean;
  temp: boolean;
  created_at: string;
  [field: string]: unknown;
}

export interface MutedUser {
  id: number;
  display_name?: string;
  [field: string]: unknown;
}

export interface PopupSpec {
  content: ReactNode;
  classNames?: string[];
  afterClose?: () => void;
  hideCloseButton?: boolean;
}

export interface SiteContexts {
  auth: {
    user: SiteUser | null;
    isLoading: boolean;
    ban: boolean;
    setBan(banned: boolean): void;
  };
  prefs: {
    muted_users: MutedUser[];
    add_muted_user(user: MutedUser): void;
    remove_muted_user(id: number): void;
  };
  cable: {
    cable: { transport?: AnyCableTransport };
    subscriptions: unknown;
  };
  popups: {
    openPopup(spec: PopupSpec): void;
    closePopup(id: number): void;
    closeAllPopups(): void;
  };
  groupChat: {
    messages: unknown[];
    onlineUsers: unknown[];
    addMessage(message: unknown): void;
  };
  router: {
    pathname: string;
    asPath: string;
    push(url: string): Promise<boolean>;
    events: {
      on(event: string, handler: (...args: unknown[]) => void): void;
      off(event: string, handler: (...args: unknown[]) => void): void;
    };
  };
}
