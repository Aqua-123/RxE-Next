import { featureStatuses, setFeatureEnabled } from "./features/runner";
import { META } from "./meta";
import { cable, type CableMessage } from "./platform/cable";
import { attempt } from "./platform/log";

/** Event names kept from the old RxE plugin API so existing plugins keep working. */
export type RxEEventName =
  | "room.join"
  | "room.leave"
  | "room.received"
  | "user.joined"
  | "user.left"
  | "user.message";

export type RxEEvent = CableMessage & {
  type: RxEEventName;
  room: unknown;
  preventDefault(): void;
};

type Listener = (event: RxEEvent) => void;

const listeners = new Map<string, Set<Listener>>();

/** Returns whether a listener called `preventDefault()`. */
function dispatch(type: RxEEventName, room: unknown, payload: CableMessage = {}): boolean {
  const registered = listeners.get(type);
  if (!registered?.size) return false;
  let prevented = false;
  const event: RxEEvent = {
    ...payload,
    type,
    room,
    preventDefault() {
      prevented = true;
    },
  };
  registered.forEach((listener) => attempt(`RxE ${type} listener`, () => listener(event)));
  return prevented;
}

export interface RxEApi {
  version(): string;
  addEventListener(type: RxEEventName, listener: Listener): void;
  removeEventListener(type: RxEEventName, listener: Listener): void;
  features: typeof featureStatuses;
  setFeatureEnabled: typeof setFeatureEnabled;
}

/**
 * Exposes `window.RxE`. Room events come from the cable protocol rather than the
 * site's components, so they survive frontend rewrites. `preventDefault()` on an
 * incoming event drops the frame before the site sees it.
 */
export function installPublicApi(): void {
  const api: RxEApi = {
    version: () => `${META.name} ${META.version}`,
    addEventListener(type, listener) {
      const registered = listeners.get(type) ?? new Set();
      registered.add(listener);
      listeners.set(type, registered);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    features: featureStatuses,
    setFeatureEnabled,
  };
  Object.defineProperty(globalThis, "RxE", { value: Object.freeze(api), configurable: true });

  cable.onIncoming(({ identifier, message }) => {
    if (identifier.channel !== "RoomChannel" || listeners.size === 0) return;
    const room = identifier.room_id;
    let prevented = dispatch("room.received", room, message);
    if (message.user && message.user_connected)
      prevented = dispatch("user.joined", room, message) || prevented;
    if (message.user && message.user_disconnected)
      prevented = dispatch("user.left", room, message) || prevented;
    if (message.messages?.length) prevented = dispatch("user.message", room, message) || prevented;
    if (prevented) return "drop";
  });

  cable.onOutgoing((command) => {
    if (command.identifier.channel !== "RoomChannel" || command.command === "message") return;
    dispatch(command.command === "subscribe" ? "room.join" : "room.leave", command.identifier.room_id);
  });
}
