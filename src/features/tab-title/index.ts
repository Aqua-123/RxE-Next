import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import { META } from "@/meta";

export default defineFeature({
  id: "tab-title",
  name: "Your name as the tab title",
  description:
    "Shows your display name in the browser tab instead of the site's “Omegle alternative for…”, so you can tell your accounts apart.",
  category: "appearance",
  settings: {
    version: setting.boolean({ label: "Add the RxE version", default: true }),
  },
  when: (env) => env.user !== null,
  setup({ settings, site, ui }) {
    let stop: (() => void) | undefined;
    settings.watch(({ version }) => {
      const name = site.currentUser()?.name || "RxE";
      stop?.();
      stop = ui.chrome.tabTitle(version ? `${name} - ${META.name} ${META.version}` : name);
    });
  },
});
