import { DragDropIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import {
  moveTo,
  normalize,
  type Panel,
  type Placement,
  SLOTS,
  type Slot,
  slotAt,
} from "@/site/panelLayout";
import type { GroupLayoutApi } from "@/site/surfaces/groupLayout";

const PANEL_NAMES: Record<Panel, string> = { channels: "Channels", online: "Online users" };
const SLOT_NAMES: Record<Slot, string> = {
  "left-top": "Left, top",
  "left-bottom": "Left, bottom",
  "right-top": "Right, top",
  "right-bottom": "Right, bottom",
};
const slotOptions = SLOTS.map((value) => ({ value, label: SLOT_NAMES[value] }));

interface Drag {
  panel: Panel;
  target: Slot;
}

const drag = createStore<{ current: Drag | null }>(() => ({ current: null }));

function Handle({
  panel,
  layout,
  placement,
  commit,
}: {
  panel: Panel;
  layout: GroupLayoutApi;
  placement(): Placement;
  commit(next: Placement): void;
}) {
  const start = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const from = placement()[panel];
    drag.setState({ current: { panel, target: from } });
    layout.setDragging(panel);

    // The layout follows the pointer: the panels move as soon as it crosses into another quarter.
    const move = (moveEvent: PointerEvent) => {
      const box = layout.box();
      if (!box) return;
      const target = slotAt(moveEvent.clientX, moveEvent.clientY, box);
      if (drag.getState().current?.target === target) return;
      layout.arrange(moveTo(placement(), panel, target), { animate: true });
      drag.setState({ current: { panel, target } });
    };
    const end = (endEvent: PointerEvent) => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", end);
      removeEventListener("keydown", cancel);
      const current = drag.getState().current;
      drag.setState({ current: null });
      layout.setDragging(null);
      if (current && endEvent.type === "pointerup")
        commit(moveTo(placement(), panel, current.target));
      else layout.arrange(placement(), { animate: true });
    };
    const cancel = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") end(new PointerEvent("pointercancel"));
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", end);
    addEventListener("keydown", cancel);
  };

  const target = useStore(drag, (state) =>
    state.current?.panel === panel ? state.current.target : null
  );

  return (
    <>
      {target && (
        <span className="pointer-events-none absolute inset-x-0 top-1/2 z-10 mx-auto w-fit -translate-y-1/2 rounded-full bg-primary px-3 py-1.5 font-semibold text-primary-foreground text-xs shadow-lg">
          {SLOT_NAMES[target]}
        </span>
      )}
      <button
        type="button"
        onPointerDown={start}
        aria-label={`Move the ${PANEL_NAMES[panel]} panel`}
        title="Drag to move this panel"
        className="absolute top-3 right-3 z-10 flex size-7 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
      >
        <HugeiconsIcon icon={DragDropIcon} className="size-4" />
      </button>
    </>
  );
}

export default defineFeature({
  id: "panel-layout",
  name: "Movable side panels",
  description:
    "Drag group chat's Channels and Online panels by the handle in their corner, to either side of the chat or above and below each other. The layout moves as you drag, and is remembered.",
  category: "appearance",
  settings: {
    channels: setting.select({
      label: "Channels panel",
      options: slotOptions,
      default: "left-top",
    }),
    online: setting.select({
      label: "Online users panel",
      options: slotOptions,
      default: "left-bottom",
    }),
  },
  setup({ settings, ui }) {
    const placement = (): Placement => normalize(settings.get());
    const commit = (next: Placement) => {
      settings.set("channels", next.channels);
      settings.set("online", next.online);
    };
    settings.watch(() => ui.groupLayout.arrange(placement(), { animate: true }));
    ui.groupLayout.addPanelControl((panel) => (
      <Handle panel={panel} layout={ui.groupLayout} placement={placement} commit={commit} />
    ));
  },
});
