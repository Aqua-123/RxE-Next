import { registerFeatures, updateEnvironment } from "./core/runtime";
import avatarBorders from "./features/avatar-borders";
import muteEverywhere from "./features/mute-everywhere";
import profileViewer from "./features/profile-viewer";
import richText from "./features/rich-text";
import settings from "./features/settings";
import { META } from "./meta";
import { adoptTransport, cable, installCableTap } from "./platform/cable";
import { log } from "./platform/log";
import { currentPath, installRouteTap, onRouteChange } from "./platform/route";
import { installWebpackTap } from "./platform/webpack";
import { currentUser } from "./site/api";
import { siteContext, whenSiteMounted } from "./site/contexts";
import { installChatSurface } from "./site/surfaces/chat";
import { installMessagesSurface } from "./site/surfaces/messages";
import { startThemeEngine } from "./themes/engine";

const FEATURES = [richText, muteEverywhere, avatarBorders, profileViewer, settings];

function boot(): void {
  // All taps must be in place before any site script runs.
  installWebpackTap();
  installCableTap();
  installRouteTap();
  installChatSurface();
  installMessagesSurface();
  startThemeEngine();

  // Registers raw patches synchronously, before the site's chunks load.
  registerFeatures(FEATURES);
  updateEnvironment({ path: currentPath() });

  onRouteChange((path) => updateEnvironment({ path }));
  whenSiteMounted(() => {
    const transport = siteContext("cable")?.cable.transport;
    if (!cable.attached && transport) adoptTransport(transport);
    updateEnvironment({ user: currentUser() });
  });
  log.info(`${META.name} ${META.version} loaded`);
}

const flag = "__RXE_NEXT_LOADED__";
const onOldSite = location.pathname.startsWith("/old/");
// Userscript managers also inject into iframes (Turnstile, Stripe, ads); RxE only belongs in the app itself.
const isTopFrame = window.top === window;
if (isTopFrame && !onOldSite && !(flag in globalThis)) {
  Object.defineProperty(globalThis, flag, { value: true });
  boot();
}
