import { defineFeature } from "@/core/feature";
import { SettingsMenuItem } from "./SettingsMenuItem";
import { SettingsPanel } from "./SettingsPanel";
import { setSettingsOpen } from "./state";

export default defineFeature({
  id: "settings",
  name: "RxE settings",
  description: "Adds RxE Settings to the account menu.",
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
  },
});
