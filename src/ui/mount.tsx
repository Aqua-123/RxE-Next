import { createContext, useContext, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { adoptStyles } from "./styles";
import tokens from "./tokens.module.css";

export type Placement = "before" | "after" | "prepend" | "append";

const PortalContainer = createContext<HTMLElement | null>(null);

/** Where popups (dialogs, menus) must portal to: inside RxE's shadow root, never the site's body. */
export function usePortalContainer(): HTMLElement | null {
  return useContext(PortalContainer);
}

/**
 * Renders a component inside the site's DOM, next to `anchor`. The wrapper uses
 * `display: contents`, so the component's own root takes part in the site's layout
 * as if the site had rendered it.
 */
export function mountInline(node: ReactNode, anchor: Element, placement: Placement): () => void {
  const slot = document.createElement("rxe-slot");
  slot.style.display = "contents";
  anchor[placement](slot);
  const root = createRoot(slot);
  root.render(node);
  return () => {
    root.unmount();
    slot.remove();
  };
}

/**
 * Renders a component into its own shadow root on `<body>`, isolated from the
 * site's CSS. The container carries RxE's UI tokens and receives all portals.
 */
export function mountIsolated(node: ReactNode): () => void {
  const host = document.createElement("rxe-root");
  const shadow = host.attachShadow({ mode: "open" });
  const releaseStyles = adoptStyles(shadow);
  const container = document.createElement("div");
  container.className = tokens.root ?? "";
  shadow.append(container);
  document.body.append(host);

  const root = createRoot(container);
  root.render(<PortalContainer.Provider value={container}>{node}</PortalContainer.Provider>);
  return () => {
    root.unmount();
    releaseStyles();
    host.remove();
  };
}
