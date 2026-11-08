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

const HEADER_ICONS = '[class*="Layout_event_container__"]';

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
        <h2>{META.name}</h2>
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

export default defineFeature({
  id: "panel",
  name: "RxE panel",
  description: "Adds an RxE button to the header that opens RxE settings.",
  defaultEnabled: true,
  locked: true,
  requires: ["bridge", "react"],
  routes: /^\/app(\/|$)/,
  setup() {
    const removeStyle = injectStyle("panel", css);
    const stopWatching = watch(HEADER_ICONS, (icons) => {
      const button = document.createElement("button");
      button.className = "btn-basic btn-primary-solid btn-xsm rxe-panel-button";
      button.textContent = "RxE";
      button.setAttribute("aria-label", "Open RxE settings");
      button.addEventListener("click", openPanel);
      icons.prepend(button);
      return () => button.remove();
    });
    return () => {
      stopWatching();
      removeStyle();
    };
  },
});
