import type { ReactNode } from "react";
import type { Scope } from "@/core/scope";
import { watch } from "@/platform/dom";
import { mount } from "@/ui/mount";

/** The account dropdown is only mounted while open; Logout is its one stably-named item. */
const ACCOUNT_MENU = '[role="menu"]:has([data-sentry-component="LogoutBtn"])';
const LOGOUT_ITEM = '.menuItem:has([data-sentry-component="LogoutBtn"])';

export interface AccountMenuItemProps {
  /** Closes the dropdown the way the site does, keeping its open state in sync. */
  close(): void;
}

export interface AccountMenuApi {
  /** Adds an item above Logout, each time the menu opens. */
  addItem(render: (props: AccountMenuItemProps) => ReactNode): void;
}

function closeMenu(menu: Element): void {
  menu.parentElement
    ?.querySelector<HTMLElement>(':scope > [role="button"][aria-expanded="true"]')
    ?.click();
}

export function scopedAccountMenu(scope: Scope): AccountMenuApi {
  return {
    addItem(render) {
      const stop = watch(ACCOUNT_MENU, (menu) => {
        const node = render({ close: () => closeMenu(menu) });
        const logout = menu.querySelector(LOGOUT_ITEM);
        return logout ? mount(node, logout, "before") : mount(node, menu, "append");
      });
      scope.add(stop);
    },
  };
}
