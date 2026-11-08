import { render, type ComponentChild } from "preact";
import { adoptStyles } from "./styles";

export type Placement = "before" | "after" | "prepend" | "append";

/**
 * Renders a component inside the site's DOM, next to `anchor`. The wrapper uses
 * `display: contents`, so the component's own root takes part in the site's layout
 * as if the site had rendered it.
 */
export function mountInline(node: ComponentChild, anchor: Element, placement: Placement): () => void {
  const slot = document.createElement("rxe-slot");
  slot.style.display = "contents";
  anchor[placement](slot);
  render(node, slot);
  return () => {
    render(null, slot);
    slot.remove();
  };
}

/** Renders a component into its own shadow root on `<body>`, isolated from the site's CSS. */
export function mountIsolated(node: ComponentChild): () => void {
  const host = document.createElement("rxe-root");
  const shadow = host.attachShadow({ mode: "open" });
  const releaseStyles = adoptStyles(shadow);
  document.body.append(host);
  render(node, shadow);
  return () => {
    render(null, shadow);
    releaseStyles();
    host.remove();
  };
}
