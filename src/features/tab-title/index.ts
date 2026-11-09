import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import { META } from "@/meta";
import icon from "./icon.png";

export default defineFeature({
  id: "tab-title",
  name: "Your name in the tab",
  description:
    "Shows your display name and the old RxE icon in the browser tab instead of the site's “Omegle alternative for…”, so you can tell RxE tabs and accounts apart.",
  category: "appearance",
  settings: {
    version: setting.boolean({ label: "Add the RxE version", default: true }),
    icon: setting.boolean({ label: "RxE tab icon", default: true }),
  },
  when: (env) => env.user !== null,
  setup({ settings, site, ui }) {
    let stopTitle: (() => void) | undefined;
    let stopIcon: (() => void) | undefined;
    settings.watch((values) => {
      const name = site.currentUser()?.name || "RxE";
      stopTitle?.();
      stopTitle = ui.chrome.tabTitle(
        values.version ? `${name} - ${META.name} ${META.version}` : name
      );
      stopIcon?.();
      stopIcon = values.icon ? ui.chrome.tabIcon(icon) : undefined;
    });
  },
});
