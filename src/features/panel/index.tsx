import { META } from "../../meta";
import { siteContext } from "../../platform/bridge";
import { injectStyle, watch } from "../../platform/dom";
import { log } from "../../platform/log";
import { h, react } from "../../ui/jsx";
import { defineFeature } from "../feature";
import {
  featureStatuses,
  onFeatureStatusChange,
  setFeatureEnabled,
  type FeatureState,
} from "../runner";
import css from "./panel.css";

/** The gear dropdown is only mounted while open; Logout is its one stably-named item. */
const ACCOUNT_MENU = '[role="menu"]:has([data-sentry-component="LogoutBtn"])';

function describe(state: FeatureState): string {
  switch (state.kind) {
    case "running":
      return "Running";
    case "off":
      return "Off";
    case "waiting":
      return `Idle: ${state.reason}`;
    case "error":
      return `Error: ${state.message}`;
  }
}

function Panel() {
  const { useEffect, useState } = react();
  const [statuses, setStatuses] = useState(featureStatuses);
  useEffect(() => onFeatureStatusChange(() => setStatuses(featureStatuses())), []);

  return (
    <div className="rxe-panel">
      <header className="rxe-panel__header">
        <h2 className="rxe-shimmer">{META.name}</h2>
        <small>v{META.version}</small>
      </header>
      <ul className="rxe-panel__features">
        {statuses
          .filter((status) => !status.locked)
          .map((status) => (
            <li key={status.id} className="rxe-panel__feature">
              <label>
                <input
                  type="checkbox"
                  checked={status.enabled}
                  onChange={(event) => setFeatureEnabled(status.id, event.currentTarget.checked)}
                />
                <span>{status.name}</span>
              </label>
              <p>{status.description}</p>
              <small data-state={status.state.kind}>{describe(status.state)}</small>
            </li>
          ))}
      </ul>
    </div>
  );
}

function openPanel(): void {
  const popups = siteContext("popups");
  if (!popups) {
    log.warn("Popup manager not found; cannot open the RxE panel");
    return;
  }
  popups.openPopup({ content: <Panel />, classNames: ["rxe-popup"] });
}

/** Closes the dropdown through its own toggle so the site's open state stays in sync. */
function closeMenu(menu: Element): void {
  menu.parentElement
    ?.querySelector<HTMLElement>(':scope > [role="button"][aria-expanded="true"]')
    ?.click();
}

function addMenuItem(menu: Element): () => void {
  const item = document.createElement("div");
  item.className = "menuItem rxe-menu-item";
  item.setAttribute("role", "menuitem");

  const button = document.createElement("button");
  button.className = "btn-basic";
  button.innerHTML = '<span class="rxe-shimmer" aria-hidden="true">✦</span> <span class="rxe-shimmer">RxE Settings</span>';
  button.setAttribute("aria-label", "RxE Settings");
  button.addEventListener("click", () => {
    closeMenu(menu);
    openPanel();
  });
  item.append(button);

  const logout = menu.querySelector('[data-sentry-component="LogoutBtn"]')?.closest(".menuItem");
  menu.insertBefore(item, logout ?? null);
  return () => item.remove();
}

export default defineFeature({
  id: "panel",
  name: "RxE panel",
  description: "Adds RxE Settings to the account menu.",
  defaultEnabled: true,
  locked: true,
  requires: ["bridge", "react"],
  routes: /^\/app(\/|$)/,
  setup() {
    const removeStyle = injectStyle("panel", css);
    const stopWatching = watch(ACCOUNT_MENU, addMenuItem);
    return () => {
      stopWatching();
      removeStyle();
    };
  },
});
