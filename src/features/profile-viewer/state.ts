import { createStore } from "zustand/vanilla";
import type { UserId } from "@/site/model";

export const wallViewer = createStore<{ userId: UserId | null }>(() => ({ userId: null }));

export const openWall = (userId: UserId) => wallViewer.setState({ userId });
export const closeWall = () => wallViewer.setState({ userId: null });
