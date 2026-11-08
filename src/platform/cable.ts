import { attempt } from "./log";

const CABLE_URL = /^wss:\/\/wss\.emeraldchat\.com\/cable/;

export interface ChannelIdentifier {
  channel: string;
  [param: string]: unknown;
}

/** Server JSON, untyped until `site/wire.ts` parses it into domain types. */
export type CableMessage = Record<string, unknown>;

export interface IncomingFrame {
  identifier: ChannelIdentifier;
  message: CableMessage;
}

export type IncomingVerdict = undefined | "drop" | { message: CableMessage };

export type OutgoingCommand =
  | { command: "subscribe" | "unsubscribe"; identifier: ChannelIdentifier }
  | {
      command: "message";
      identifier: ChannelIdentifier;
      data: CableMessage & { action: string };
    };

export type OutgoingVerdict = undefined | "drop" | { data: CableMessage };

type IncomingHandler = (frame: IncomingFrame) => IncomingVerdict;
type OutgoingHandler = (command: OutgoingCommand) => OutgoingVerdict;
type MessageHandler = ((this: WebSocket, event: MessageEvent) => unknown) | null;

const incomingHandlers = new Set<IncomingHandler>();
const outgoingHandlers = new Set<OutgoingHandler>();
const hookedSockets = new WeakSet<object>();
let installedBeforeApp = false;
let adoptedLate = false;

function isObject(value: unknown): value is CableMessage {
  return typeof value === "object" && value !== null;
}

function parse(text: unknown): CableMessage | undefined {
  if (typeof text !== "string") return undefined;
  try {
    const value: unknown = JSON.parse(text);
    return isObject(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function parseIdentifier(value: unknown): ChannelIdentifier | undefined {
  const identifier = parse(value);
  return typeof identifier?.channel === "string" ? (identifier as ChannelIdentifier) : undefined;
}

/** Returns the rewritten frame, `null` to drop it, or `undefined` to pass it through untouched. */
function filterIncoming(data: unknown): string | null | undefined {
  if (incomingHandlers.size === 0) return undefined;
  const raw = parse(data);
  if (!raw || raw.type || !isObject(raw.message)) return undefined;
  const identifier = parseIdentifier(raw.identifier);
  if (!identifier) return undefined;

  let message = raw.message;
  let changed = false;
  for (const handler of incomingHandlers) {
    const frame = { identifier, message };
    const verdict = attempt("cable incoming handler", () => handler(frame));
    if (verdict === "drop") return null;
    if (verdict) {
      message = verdict.message;
      changed = true;
    }
  }
  return changed ? JSON.stringify({ ...raw, message }) : undefined;
}

/** Returns the data to send, or `null` to drop the command. */
function filterOutgoing<T>(data: T): T | string | null {
  if (outgoingHandlers.size === 0) return data;
  const raw = parse(data);
  const identifier = parseIdentifier(raw?.identifier);
  if (!raw || !identifier) return data;

  if (raw.command === "subscribe" || raw.command === "unsubscribe") {
    const command: OutgoingCommand = { command: raw.command, identifier };
    for (const handler of outgoingHandlers) {
      if (attempt("cable outgoing handler", () => handler(command)) === "drop") return null;
    }
    return data;
  }

  if (raw.command !== "message") return data;
  let payload = parse(raw.data);
  if (typeof payload?.action !== "string") return data;
  let changed = false;
  for (const handler of outgoingHandlers) {
    const command: OutgoingCommand = {
      command: "message",
      identifier,
      data: payload as CableMessage & { action: string },
    };
    const verdict: OutgoingVerdict = attempt("cable outgoing handler", () => handler(command));
    if (verdict === "drop") return null;
    if (verdict) {
      payload = verdict.data;
      changed = true;
    }
  }
  return changed ? JSON.stringify({ ...raw, data: JSON.stringify(payload) }) : data;
}

function findAccessor(target: object, key: string) {
  for (let proto = Object.getPrototypeOf(target); proto; proto = Object.getPrototypeOf(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, key);
    if (descriptor) return descriptor;
  }
  return undefined;
}

/**
 * Puts the RxE filter between the socket and whatever the app attaches to it.
 * AnyCable assigns `onmessage`, so the native slot permanently holds a relay and
 * the app's handler is kept on an instance-level property. `addEventListener`
 * listeners are wrapped too, so a site update that switches APIs keeps working.
 */
export function hookSocket(socket: WebSocket): void {
  if (hookedSockets.has(socket)) return;
  hookedSockets.add(socket);

  const verdicts = new WeakMap<Event, MessageEvent | null>();
  const filterEvent = (event: MessageEvent): MessageEvent | null => {
    if (!verdicts.has(event)) {
      const data = filterIncoming(event.data);
      verdicts.set(
        event,
        data === undefined
          ? event
          : data === null
            ? null
            : new MessageEvent("message", {
                data,
                origin: event.origin,
                lastEventId: event.lastEventId,
              })
      );
    }
    return verdicts.get(event) ?? null;
  };

  let appHandler: MessageHandler = socket.onmessage;
  findAccessor(socket, "onmessage")?.set?.call(
    socket,
    function relay(this: WebSocket, event: MessageEvent) {
      const next = filterEvent(event);
      if (next) appHandler?.call(this, next);
    }
  );
  Object.defineProperty(socket, "onmessage", {
    configurable: true,
    enumerable: true,
    get: () => appHandler,
    set: (handler: MessageHandler) => {
      appHandler = handler;
    },
  });

  const wrappedListeners = new WeakMap<object, EventListener>();
  const wrap = (listener: EventListenerOrEventListenerObject): EventListener => {
    let wrapped = wrappedListeners.get(listener);
    if (!wrapped) {
      wrapped = (event) => {
        const next = filterEvent(event as MessageEvent);
        if (!next) return;
        if (typeof listener === "function") listener.call(socket, next);
        else listener.handleEvent(next);
      };
      wrappedListeners.set(listener, wrapped);
    }
    return wrapped;
  };
  const nativeAdd = socket.addEventListener.bind(socket);
  const nativeRemove = socket.removeEventListener.bind(socket);
  socket.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) => {
    if (listener) nativeAdd(type, type === "message" ? wrap(listener) : listener, options);
  }) as WebSocket["addEventListener"];
  socket.removeEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions
  ) => {
    if (listener) nativeRemove(type, wrappedListeners.get(listener) ?? listener, options);
  }) as WebSocket["removeEventListener"];

  const nativeSend = socket.send.bind(socket);
  socket.send = (data) => {
    const next = filterOutgoing(data);
    if (next !== null) nativeSend(next);
  };
}

export function installCableTap(): void {
  installedBeforeApp = !("next" in globalThis);
  globalThis.WebSocket = new Proxy(globalThis.WebSocket, {
    construct(target, args: ConstructorParameters<typeof WebSocket>, newTarget) {
      const socket: WebSocket = Reflect.construct(target, args, newTarget);
      if (CABLE_URL.test(String(args[0]))) hookSocket(socket);
      return socket;
    },
  });
}

export interface AnyCableTransport {
  ws?: WebSocket;
  /** The constructor AnyCable captured when the consumer was created; used for every reconnect. */
  Impl?: typeof WebSocket;
}

/**
 * Late injection (e.g. a userscript manager at document-end): the app already
 * created its consumer with the native constructor. Hook the open socket and
 * route future reconnects through the tap.
 */
export function adoptTransport(transport: AnyCableTransport): void {
  if (transport.ws) hookSocket(transport.ws);
  if (transport.Impl) {
    transport.Impl = globalThis.WebSocket;
    adoptedLate = true;
  }
}

export const cable = {
  onIncoming(handler: IncomingHandler): () => void {
    incomingHandlers.add(handler);
    return () => {
      incomingHandlers.delete(handler);
    };
  },
  onOutgoing(handler: OutgoingHandler): () => void {
    outgoingHandlers.add(handler);
    return () => {
      outgoingHandlers.delete(handler);
    };
  },
  /** Whether every cable socket the app uses passes through the filter. */
  get attached(): boolean {
    return installedBeforeApp || adoptedLate;
  },
};
