import { createStore } from "zustand/vanilla";

export type SettingsTab = "chat" | "appearance" | "profiles" | "moderation" | "themes" | "backup";

export const settingsPanel = createStore<{ open: boolean; tab: SettingsTab }>(() => ({
  open: false,
  tab: "chat",
}));

export const setSettingsOpen = (open: boolean) => settingsPanel.setState({ open });
export const setSettingsTab = (tab: SettingsTab) => settingsPanel.setState({ tab });
