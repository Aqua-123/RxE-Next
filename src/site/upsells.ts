/**
 * Where the site advertises its paid plans. Components are matched by the
 * `data-sentry-component` names Sentry's build step stamps on them, which follow
 * the source file names and so survive restyles.
 */
const component = (name: string) => `[data-sentry-component="${name}"]`;

export const UPSELLS = {
  /**
   * Banners on the match pages and in chats: Gold, Spark, gifts, karma packs. Not
   * PrivateGroupChatAd: for non-Premium users it is the whole "Create your own channel" page.
   */
  ads: [
    component("MatchPageAd"),
    component("SparkAd"),
    component("GiftingAd"),
    component("StaticGenderAd"),
    component("PurchaseKarmaAd"),
  ],
  /** "Emerald Gold", "Emerald Platinum", "Emerald Premium" and "Buy Karma" in the account menu. */
  menu: [
    '[role="menu"] .menuItem:has(> .text-warning)',
    '[role="menu"] .menuItem:has(> #buy_karma_btn)',
  ],
  /** The image button next to the chat box, which only shows "Upgrade to Gold" unless you have Gold. */
  goldUpload: [component("UploadGoldImage")],
} as const;

export function hideCss(selectors: readonly string[]): string {
  return selectors.length ? `${selectors.join(",")}{display:none!important}` : "";
}
