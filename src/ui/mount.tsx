import { createContext, type ReactNode, useContext } from "react";
import { createRoot } from "react-dom/client";
import { injectStyle } from "@/platform/dom";
import { adoptRxeStyles } from "./styles";

export type Placement = "before" | "after" | "prepend" | "append";

const PortalContainer = createContext<ShadowRoot | null>(null);

/** Popups (dialogs, menus, tooltips) must portal here to stay inside RxE's styles. */
export function usePortalContainer(): ShadowRoot | null {
  return useContext(PortalContainer);
}

export interface MountedRoot {
  render(node: ReactNode): void;
  unmount(): void;
}

let hostStyleInstalled = false;

/**
 * Creates an RxE React root at a spot in the site's DOM, inside its own shadow root.
 * Hosts lay out as `display: contents`, so components sit in the site's layout as if
 * the site had rendered them and inherit its font, while RxE's styles and the site's
 * never mix.
 */
export function mountRoot(anchor: Element, placement: Placement): MountedRoot {
  if (!hostStyleInstalled) {
    hostStyleInstalled = true;
    injectStyle("rxe-hosts", "rxe-root,rxe-text{display:contents}");
  }
  const host = document.createElement("rxe-root");
  const shadow = host.attachShadow({ mode: "open" });
  const releaseStyles = adoptRxeStyles(shadow);
  anchor[placement](host);

  const root = createRoot(shadow);
  return {
    render: (node) =>
      root.render(<PortalContainer.Provider value={shadow}>{node}</PortalContainer.Provider>),
    unmount() {
      root.unmount();
      releaseStyles();
      host.remove();
    },
  };
}

export function mount(node: ReactNode, anchor: Element, placement: Placement): () => void {
  const root = mountRoot(anchor, placement);
  root.render(node);
  return root.unmount;
}
