/** Group chat's two side panels on desktop, and where each can go. */
export type Panel = "channels" | "online";
export type Slot = "left-top" | "left-bottom" | "right-top" | "right-bottom";
export type Placement = Readonly<Record<Panel, Slot>>;

export const SLOTS: readonly Slot[] = ["left-top", "left-bottom", "right-top", "right-bottom"];
/** The site's own layout: both panels on the left, channels above. */
export const SITE_PLACEMENT: Placement = { channels: "left-top", online: "left-bottom" };

const side = (slot: Slot) => (slot.startsWith("left") ? "left" : "right");
const row = (slot: Slot) => (slot.endsWith("top") ? "top" : "bottom");
const slotOf = (s: "left" | "right", r: "top" | "bottom") => `${s}-${r}` as Slot;

/** Two panels can't share a slot; the second gives way to the other row of the same side. */
export function normalize(placement: Placement): Placement {
  if (placement.channels !== placement.online) return placement;
  const other = row(placement.online) === "top" ? "bottom" : "top";
  return { ...placement, online: slotOf(side(placement.online), other) };
}

/** Moves `panel` to `slot`; a panel already there takes the moved panel's old slot. */
export function moveTo(placement: Placement, panel: Panel, slot: Slot): Placement {
  const other: Panel = panel === "channels" ? "online" : "channels";
  if (placement[other] === slot) return { [panel]: slot, [other]: placement[panel] } as Placement;
  return normalize({ ...placement, [panel]: slot });
}

export interface GridArea {
  column: number;
  /** CSS grid-row: one row, or both when the panel is alone on its side. */
  row: string;
}

export interface Arrangement {
  columns: string;
  chat: GridArea;
  channels: GridArea;
  online: GridArea;
}

/** Panel columns keep the site's width (about 20%, never under 200px). */
const PANEL_COLUMN = "minmax(200px, 18%)";

export function arrange(input: Placement): Arrangement {
  const placement = normalize(input);
  const sides = new Set([side(placement.channels), side(placement.online)]);
  const order = [sides.has("left") && "left", "chat", sides.has("right") && "right"].filter(
    Boolean
  ) as string[];
  const column = (name: string) => order.indexOf(name) + 1;
  const area = (panel: Panel): GridArea => {
    const slot = placement[panel];
    const shared = side(placement.channels) === side(placement.online);
    return {
      column: column(side(slot)),
      row: shared ? (row(slot) === "top" ? "1" : "2") : "1 / span 2",
    };
  };
  return {
    columns: order.map((name) => (name === "chat" ? "minmax(0, 1fr)" : PANEL_COLUMN)).join(" "),
    chat: { column: column("chat"), row: "1 / span 2" },
    channels: area("channels"),
    online: area("online"),
  };
}

/** Which slot a point is over, given the chat area's box: by half, horizontally and vertically. */
export function slotAt(
  x: number,
  y: number,
  box: { left: number; top: number; width: number; height: number }
): Slot {
  return slotOf(
    x < box.left + box.width / 2 ? "left" : "right",
    y < box.top + box.height / 2 ? "top" : "bottom"
  );
}

export const isSitePlacement = (placement: Placement) =>
  placement.channels === SITE_PLACEMENT.channels && placement.online === SITE_PLACEMENT.online;
