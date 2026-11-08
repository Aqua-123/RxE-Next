import { createContext, useContext, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { adoptRxeStyles } from "./styles";

export type Placement = "before" | "after" | "prepend" | "append";

const PortalContainer = createContext<ShadowRoot | null>(null);

/** Popups (dialogs, menus, tooltips) must portal here to stay inside RxE's styles. */
export function usePortalContainer(): ShadowRoot | null {
  return useContext(PortalContainer);
}

/**
 * Renders RxE UI at a spot in the site's DOM, inside its own shadow root. The host
 * uses `display: contents`, so the component lays out as if the site had rendered
 * it and inherits the site's font, while RxE's styles and the site's never mix.
 */
export function mount(node: ReactNode, anchor: Element, placement: Placement): () => void {
  const host = document.createElement("rxe-root");
  host.style.display = "contents";
  const shadow = host.attachShadow({ mode: "open" });
  adoptRxeStyles(shadow);
  anchor[placement](host);

  const root = createRoot(shadow);
  root.render(<PortalContainer.Provider value={shadow}>{node}</PortalContainer.Provider>);
  return () => {
    root.unmount();
    host.remove();
  };
}
