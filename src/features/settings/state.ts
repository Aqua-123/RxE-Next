import { createStore } from "zustand/vanilla";

export const settingsPanel = createStore<{ open: boolean }>(() => ({ open: false }));

export const setSettingsOpen = (open: boolean) => settingsPanel.setState({ open });
