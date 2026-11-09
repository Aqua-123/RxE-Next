import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import { hideCss, UPSELLS } from "@/site/upsells";

export default defineFeature({
  id: "hide-upsells",
  name: "Hide ads and upsells",
  description: "Removes the site's ads for Gold, Premium, Spark, gifts and karma.",
  category: "appearance",
  settings: {
    ads: setting.boolean({
      label: "Ad banners",
      description: "On the match pages and in chats.",
      default: true,
    }),
    menu: setting.boolean({
      label: "Upgrade items in the account menu",
      description: "Emerald Gold, Platinum, Premium and Buy Karma.",
      default: true,
    }),
    goldUpload: setting.boolean({
      label: "Gold-only image button",
      description: "Without Gold it only opens an upgrade popup. Use RxE's image button instead.",
      default: true,
    }),
  },
  // Whether you have Gold decides the image button, so wait until the site knows who you are.
  when: (env) => env.user !== null,
  setup({ settings, site, ui }) {
    const isGold = site.currentUser()?.isGold ?? false;
    settings.watch(({ ads, menu, goldUpload }) => {
      ui.siteStyle(
        "hidden",
        hideCss([
          ...(ads ? UPSELLS.ads : []),
          ...(menu ? UPSELLS.menu : []),
          ...(goldUpload && !isGold ? UPSELLS.goldUpload : []),
        ])
      );
    });
  },
});
