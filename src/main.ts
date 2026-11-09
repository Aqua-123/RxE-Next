import { registerFeatures, updateEnvironment } from "./core/runtime";
import avatarBorders from "./features/avatar-borders";
import chatCommands from "./features/chat-commands";
import deliveryStatus from "./features/delivery-status";
import emailDefang from "./features/email-defang";
import embeds from "./features/embeds";
import hideTyping from "./features/hide-typing";
import hideUpsells from "./features/hide-upsells";
import inlineImages from "./features/inline-images";
import joinLeaveNotices from "./features/join-leave-notices";
import messageTimes from "./features/message-times";
import multilineInput from "./features/multiline-input";
import muteByName from "./features/mute-by-name";
import muteEverywhere from "./features/mute-everywhere";
import recentConversations from "./features/recent-conversations";
import richText from "./features/rich-text";
import sendImages from "./features/send-images";
import sendLinks from "./features/send-links";
import settings from "./features/settings";
import sidebarToggles from "./features/sidebar-toggles";
import sitePolish from "./features/site-polish";
import siteVersionLinks from "./features/site-version-links";
import textStyles from "./features/text-styles";
import userList from "./features/user-list";
import { META } from "./meta";
import { adoptTransport, cable, installCableTap } from "./platform/cable";
import { log } from "./platform/log";
import { currentPath, installRouteTap, onRouteChange } from "./platform/route";
import { installWebpackTap } from "./platform/webpack";
import { currentUser } from "./site/api";
import { siteContext, whenSiteMounted, whenUserLoaded } from "./site/contexts";
import { installChatSurface } from "./site/surfaces/chat";
import { installComposerSurface } from "./site/surfaces/composer";
import { installMessagesSurface } from "./site/surfaces/messages";
import { installSidebarsSurface } from "./site/surfaces/sidebars";
import { installUserListSurface } from "./site/surfaces/userList";
import { startThemeEngine } from "./themes/engine";

/**
 * Order matters: surfaces run handlers in this order. Composer transforms expand
 * commands, then style text (which skips links), then disguise emails and links;
 * embeds and images claim a lone link before rich text turns it into a plain link.
 */
const FEATURES = [
  chatCommands,
  textStyles,
  emailDefang,
  sendLinks,
  sendImages,
  multilineInput,
  embeds,
  inlineImages,
  richText,
  muteEverywhere,
  muteByName,
  hideTyping,
  joinLeaveNotices,
  deliveryStatus,
  messageTimes,
  userList,
  avatarBorders,
  hideUpsells,
  sidebarToggles,
  siteVersionLinks,
  sitePolish,
  recentConversations,
  settings,
];

function boot(): void {
  // All taps must be in place before any site script runs.
  installWebpackTap();
  installCableTap();
  installRouteTap();
  installChatSurface();
  installComposerSurface();
  installMessagesSurface();
  installUserListSurface();
  installSidebarsSurface();
  startThemeEngine();

  // Registers raw patches synchronously, before the site's chunks load.
  registerFeatures(FEATURES);
  updateEnvironment({ path: currentPath() });

  onRouteChange((path) => updateEnvironment({ path }));
  whenSiteMounted(() => {
    const transport = siteContext("cable")?.cable.transport;
    if (!cable.attached && transport) adoptTransport(transport);
  });
  whenUserLoaded(() => updateEnvironment({ user: currentUser() }));
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
