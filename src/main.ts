import { installPublicApi } from "./api";
import muteEverywhere from "./features/mute-everywhere";
import panel from "./features/panel";
import { evaluateFeatures, registerFeatures } from "./features/runner";
import { META } from "./meta";
import { siteContext } from "./platform/bridge";
import { adoptTransport, cable, installCableTap } from "./platform/cable";
import { log } from "./platform/log";
import { installRouteTap, onRouteChange } from "./platform/route";

const FEATURES = [muteEverywhere, panel];

/** Re-evaluates features on every DOM change until the React tree has mounted. */
function whenSiteMounted(callback: () => void): void {
  let scheduled = false;
  const check = (): boolean => {
    if (!siteContext("auth")) return false;
    observer.disconnect();
    callback();
    return true;
  };
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      check();
    });
  });
  if (!check()) observer.observe(document.documentElement, { childList: true, subtree: true });
}

function boot(): void {
  // Must run before any site script: the cable socket is created once auth resolves.
  installCableTap();
  installRouteTap();
  installPublicApi();
  registerFeatures(FEATURES);
  evaluateFeatures();

  whenSiteMounted(() => {
    const transport = siteContext("cable")?.cable.transport;
    if (!cable.attached && transport) adoptTransport(transport);
    evaluateFeatures();
  });
  onRouteChange(evaluateFeatures);
  log.info(`${META.name} ${META.version} loaded`);
}

const flag = "__RXE_NEXT_LOADED__";
const onOldSite = location.pathname.startsWith("/old/");
if (!onOldSite && !(flag in globalThis)) {
  Object.defineProperty(globalThis, flag, { value: true });
  boot();
}
