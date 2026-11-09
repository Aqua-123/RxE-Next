import type { ReactNode } from "react";
import type { Scope } from "@/core/scope";
import { injectStyle, watch } from "@/platform/dom";
import { mount } from "@/ui/mount";
import { type Arrangement, arrange, type Panel, type Placement } from "../panelLayout";

/**
 * Group chat on desktop is `#main-content` (a flex row) holding `groupLayout` (a
 * column with the two panels, each an `aside.sideInfo`, the online list `.right`)
 * and the chat. Turning `groupLayout` into `display: contents` lets a grid on
 * `#main-content` place each panel and the chat independently.
 */
const MAIN = '#main-content:has(> [class*="room_global_groupLayout__"] > aside.sideInfo.right)';
const LAYOUT = `${MAIN} > [class*="room_global_groupLayout__"]`;
const PANELS: Record<Panel, string> = {
  channels: `${LAYOUT} > aside.sideInfo:not(.right)`,
  online: `${LAYOUT} > aside.sideInfo.right`,
};
const CHAT = `${MAIN} > :not([class*="room_global_groupLayout__"])`;
const DRAGGING = "data-rxe-dragging";
const NAMES = {
  channels: "rxe-panel-channels",
  online: "rxe-panel-online",
  chat: "rxe-group-chat",
} as const;
/** The panels only sit side by side with the chat above the site's mobile breakpoint. */
const DESKTOP = "(min-width: 992px)";

function gridCss({ columns, chat, channels, online }: Arrangement): string {
  const at = (selector: string, area: { column: number; row: string }) =>
    `${selector}{grid-column:${area.column};grid-row:${area.row};min-height:0;min-width:0}`;
  return `@media ${DESKTOP}{
${MAIN}{display:grid!important;grid-template-columns:${columns};grid-template-rows:minmax(0,1fr) minmax(0,1fr)}
${LAYOUT}{display:contents}
${at(PANELS.channels, channels)}
${at(PANELS.online, online)}
${at(CHAT, chat)}
${PANELS.channels},${PANELS.online}{position:relative}
${PANELS.channels}{view-transition-name:${NAMES.channels}}
${PANELS.online}{view-transition-name:${NAMES.online}}
${CHAT}{view-transition-name:${NAMES.chat}}
${MAIN}[${DRAGGING}="channels"] ${PANELS.channels},${MAIN}[${DRAGGING}="online"] ${PANELS.online}{outline:2px solid var(--primary-500);outline-offset:-2px}
}`;
}

/**
 * Moves happen as a view transition: each panel and the chat glide from their old box
 * to the new one, showing their live content uncropped instead of a stretched snapshot.
 */
const TRANSITION_CSS = `::view-transition-old(root){display:none}
::view-transition-new(root){animation:none}
${Object.values(NAMES)
  .map(
    (
      name
    ) => `::view-transition-group(${name}){animation-duration:220ms;animation-timing-function:cubic-bezier(.2,0,0,1);overflow:clip;border-radius:12px}
::view-transition-old(${name}){display:none}
::view-transition-new(${name}){animation:none;width:100%;height:100%;object-fit:none;object-position:left top}`
  )
  .join("\n")}`;

type ViewTransitionDocument = Document & {
  startViewTransition?(update: () => void): { finished: Promise<void> };
};

function transition(update: () => void): void {
  const start = (document as ViewTransitionDocument).startViewTransition;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!start || reduced || !document.querySelector(MAIN)) update();
  else start.call(document, update);
}

export interface GroupLayoutApi {
  /**
   * Places the two panels, replacing this feature's previous placement. With `animate`,
   * they glide to their new spots.
   */
  arrange(placement: Placement, options?: { animate?: boolean }): void;
  /** Renders a control in each panel's top-right corner, e.g. a drag handle. */
  addPanelControl(render: (panel: Panel) => ReactNode): void;
  /** The box the panels are laid out in, to work out where a drag is; null off group chat. */
  box(): DOMRect | null;
  /** Lifts the panel being dragged. */
  setDragging(panel: Panel | null): void;
}

export function scopedGroupLayout(scope: Scope): GroupLayoutApi {
  let current = "";
  return {
    arrange(placement, options) {
      const css = gridCss(arrange(placement));
      if (css === current) return;
      current = css;
      scope.add(injectStyle(`group-layout-transition:${scope.owner}`, TRANSITION_CSS));
      const apply = () => scope.add(injectStyle(`group-layout:${scope.owner}`, css));
      if (options?.animate) transition(apply);
      else apply();
    },
    addPanelControl(render) {
      for (const panel of ["channels", "online"] as const) {
        scope.add(
          watch(PANELS[panel], (aside) => {
            if (!matchMedia(DESKTOP).matches) return undefined;
            return mount(render(panel), aside, "prepend");
          })
        );
      }
    },
    box: () => document.querySelector(MAIN)?.getBoundingClientRect() ?? null,
    setDragging(panel) {
      const main = document.querySelector(MAIN);
      if (!main) return;
      if (panel) main.setAttribute(DRAGGING, panel);
      else main.removeAttribute(DRAGGING);
      scope.add(() => main.removeAttribute(DRAGGING));
    },
  };
}
