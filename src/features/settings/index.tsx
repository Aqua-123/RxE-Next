import { watch } from "../../platform/dom";
import { mountInline, mountIsolated } from "../../ui/mount";
import { defineFeature } from "../feature";
import { SettingsMenuItem } from "./SettingsMenuItem";
import { SettingsPanel } from "./SettingsPanel";
import { setSettingsOpen } from "./state";

/** The account dropdown is only mounted while open; Logout is its one stably-named item. */
const ACCOUNT_MENU = '[role="menu"]:has([data-sentry-component="LogoutBtn"])';
const LOGOUT_ITEM = '.menuItem:has([data-sentry-component="LogoutBtn"])';

/** Closes the dropdown through its own toggle so the site's open state stays in sync. */
function closeMenu(menu: Element): void {
  menu.parentElement
    ?.querySelector<HTMLElement>(':scope > [role="button"][aria-expanded="true"]')
    ?.click();
}

export default defineFeature({
  id: "settings",
  name: "RxE settings",
  description: "Adds RxE Settings to the account menu.",
  defaultEnabled: true,
  locked: true,
  requires: ["bridge"],
  setup() {
    const unmountPanel = mountIsolated(<SettingsPanel />);
    const stopWatching = watch(ACCOUNT_MENU, (menu) => {
      const item = (
        <SettingsMenuItem
          onSelect={() => {
            closeMenu(menu);
            setSettingsOpen(true);
          }}
        />
      );
      const logout = menu.querySelector(LOGOUT_ITEM);
      return logout ? mountInline(item, logout, "before") : mountInline(item, menu, "append");
    });
    return () => {
      stopWatching();
      unmountPanel();
      setSettingsOpen(false);
    };
  },
});
