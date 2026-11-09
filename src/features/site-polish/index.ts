import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";

export default defineFeature({
  id: "site-polish",
  name: "Header and popup fixes",
  description: "Small fixes to the site's own controls.",
  category: "appearance",
  settings: {
    tooltips: setting.boolean({
      label: "Header tooltips",
      description: "Hover the header's icons to see what they are.",
      default: true,
    }),
    targets: setting.boolean({
      label: "Bigger header buttons on phones",
      description: "The header icons are hard to tap on small screens.",
      default: true,
    }),
    popupClose: setting.boolean({
      label: "Clear Close button on popups",
      description: "Profiles and other popups show “Close” as loose text under the card.",
      default: true,
    }),
    supportForm: setting.boolean({
      label: "Clearer support form",
      default: true,
    }),
  },
  setup({ settings, ui }) {
    const fixes = {
      tooltips: ui.chrome.headerTooltips,
      targets: ui.chrome.largerHeaderTargets,
      popupClose: ui.chrome.clearPopupClose,
      supportForm: ui.chrome.clearerSupportForm,
    };
    const applied = new Map<keyof typeof fixes, () => void>();
    settings.watch((values) => {
      for (const key of Object.keys(fixes) as (keyof typeof fixes)[]) {
        const undo = applied.get(key);
        if (values[key] && !undo) applied.set(key, fixes[key]());
        if (!values[key] && undo) {
          undo();
          applied.delete(key);
        }
      }
    });
  },
});
