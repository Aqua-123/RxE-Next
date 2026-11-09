import { defineFeature } from "@/core/feature";
import { SettingsMenuItem } from "./SettingsMenuItem";
import { SettingsNavItem } from "./SettingsNavItem";
import { SettingsPanel } from "./SettingsPanel";
import { setSettingsOpen } from "./state";

export default defineFeature({
  id: "settings",
  name: "RxE settings",
  description: "Adds RxE Settings to the account menu and the navigation drawer.",
  category: "utility",
  core: true,
  setup({ ui }) {
    ui.overlay(<SettingsPanel />);
    ui.accountMenu.addItem(({ close }) => (
      <SettingsMenuItem
        onSelect={() => {
          close();
          setSettingsOpen(true);
        }}
      />
    ));
    ui.chrome.addNavItem(() => <SettingsNavItem onSelect={() => setSettingsOpen(true)} />);
  },
});
