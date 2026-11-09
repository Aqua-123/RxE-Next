import type { ReactNode } from "react";
import { Pipeline, type Scope } from "@/core/scope";
import { injectStyle } from "@/platform/dom";
import { attempt } from "@/platform/log";
import { type SiteReact, siteReact } from "@/platform/modules";
import { exposeSurface, type Patch, registerPatches } from "@/platform/webpack";
import { type MountedRoot, mountRoot } from "@/ui/mount";
import { onlineUserCount, onOnlineCountChange } from "./userList";

/**
 * On narrow screens group chat and DMs show their side panels behind two plain-text
 * buttons under the header ("Channels >", "< Online Users", "Messages >"), rendered
 * by one shared `ToggleSidebar` component. The patch lets RxE render the label.
 */
const PATCHES: Patch[] = [
  {
    find: 'className:"triggermobile ".concat(',
    all: true,
    replace: {
      match:
        /(onClick:\(\)=>\i\(!(\i)\),className:"triggermobile "\.concat\((\i)&&"triggerright"\),"aria-label":(\i)\|\|"button disabled",children:)\4\}/,
      with: "$1$rxe.sidebars.label($4,$3,$2)}",
    },
  },
];

/** The buttons only exist below the site's 992px breakpoint. */
const BAR_HEIGHT = 48;
const BAR_CSS = `
@media(max-width:992px){
  .triggermobile{top:50px;height:${BAR_HEIGHT}px;padding:6px 8px;background:var(--base1-600);
    border-bottom:1px solid var(--base1-450);display:flex;align-items:stretch;font:inherit;cursor:pointer}
  #main-content:has(> * > .triggermobile){padding-top:${BAR_HEIGHT}px;box-sizing:border-box}
  /* DMs left room for the old buttons with a margin; the bar's padding replaces it. */
  #main-content:has(> * > .triggermobile) .chatSectionWrapper.withTabs{margin-top:0!important}
}`;

export interface SidebarToggle {
  /** The site's label without its arrow, e.g. "Channels". */
  label: string;
  side: "left" | "right";
  open: boolean;
  /** People online, for the group chat user list; null elsewhere. */
  count: number | null;
}

export interface SidebarsApi {
  /** Renders the side panel buttons on narrow screens, and lays them out as a bar. */
  renderToggle(render: (toggle: SidebarToggle) => ReactNode): void;
}

const renderers = new Pipeline<(toggle: SidebarToggle) => ReactNode>();
let version = 0;
const listeners = new Set<() => void>();

function changed(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const stop = onOnlineCountChange(listener);
  return () => {
    listeners.delete(listener);
    stop();
  };
}

/** Changes when renderers or the online count do. */
const getVersion = () => `${version}:${onlineUserCount()}`;

function render(toggle: SidebarToggle): ReactNode {
  for (const renderer of renderers) {
    const node = attempt("sidebar toggle", () => renderer(toggle));
    if (node != null) return node;
  }
  return toggle.label;
}

interface LabelProps {
  title: string;
  right: boolean;
  open: boolean;
}

function createLabel(react: SiteReact) {
  // biome-ignore lint/correctness/noComponentHookFactories: built against the site's React instance, which only exists at runtime.
  return function RxeSidebarToggle({ title, right, open }: LabelProps) {
    const host = react.useRef<HTMLElement>(null);
    const root = react.useRef<MountedRoot | null>(null);
    const current = react.useSyncExternalStore(subscribe, getVersion);
    const count = right ? onlineUserCount() : null;

    react.useLayoutEffect(() => {
      root.current = mountRoot(host.current!, "append");
      return () => {
        root.current?.unmount();
        root.current = null;
      };
    }, []);
    // biome-ignore lint/correctness/useExhaustiveDependencies: `current` changes when renderers do.
    react.useLayoutEffect(() => {
      const label = title.replace(/[<>]/g, "").trim();
      root.current?.render(render({ label, side: right ? "right" : "left", open, count }));
    }, [title, right, open, count, current]);

    return react.createElement("rxe-text", { ref: host });
  };
}

let label: ReturnType<typeof createLabel> | undefined;

/** Called from the patched toggle. Must never throw. */
const hooks = {
  label(title: unknown, right: unknown, open: unknown): unknown {
    if (typeof title !== "string" || !title.trim() || renderers.size === 0) return title;
    const react = siteReact();
    if (!react) return title;
    label ??= createLabel(react);
    return react.createElement(label, { title, right: Boolean(right), open: Boolean(open) });
  },
};

export function installSidebarsSurface(): void {
  registerPatches("surface:sidebars", PATCHES);
  exposeSurface("sidebars", hooks);
}

let removeBar: (() => void) | undefined;

export function scopedSidebars(scope: Scope): SidebarsApi {
  return {
    renderToggle(renderer) {
      const remove = renderers.add(scope, renderer);
      removeBar ??= injectStyle("sidebar-bar", BAR_CSS);
      changed();
      scope.add(() => {
        remove();
        if (renderers.size === 0) {
          removeBar?.();
          removeBar = undefined;
        }
        changed();
      });
    },
  };
}
