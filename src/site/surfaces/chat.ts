import type { Scope } from "@/core/scope";
import { cable } from "@/platform/cable";
import { attempt } from "@/platform/log";
import type { ChatEvent, OutgoingMessage } from "../model";
import { parseRoomEvent, parseSpeak, serializeRoomEvent, serializeSpeak } from "../wire";

/** Return from a chat handler to stop the event: incoming ones never reach the site, outgoing ones are never sent. */
export const drop = Symbol("drop");

type IncomingHandler = (event: ChatEvent) => ChatEvent | typeof drop | undefined;
type OutgoingHandler = (message: OutgoingMessage) => OutgoingMessage | typeof drop | undefined;

export interface ChatApi {
  /** Sees every room event (group, DM, 1-on-1) before the site does; may rewrite or drop it. */
  incoming(handler: IncomingHandler): void;
  /** Sees every message you send before it leaves; may rewrite or drop it. */
  outgoing(handler: OutgoingHandler): void;
}

const incomingHandlers = new Set<IncomingHandler>();
const outgoingHandlers = new Set<OutgoingHandler>();

function runPipeline<T>(
  handlers: Set<(value: T) => T | typeof drop | undefined>,
  initial: T
): T | typeof drop {
  let value = initial;
  for (const handler of handlers) {
    const result = attempt("chat handler", () => handler(value));
    if (result === drop) return drop;
    if (result !== undefined) value = result;
  }
  return value;
}

/** Connects the surface to the cable tap. Called once at boot. */
export function installChatSurface(): void {
  cable.onIncoming(({ identifier, message }) => {
    if (identifier.channel !== "RoomChannel" || incomingHandlers.size === 0) return;
    const event = parseRoomEvent(identifier, message);
    if (!event) return;
    const result = runPipeline(incomingHandlers, event);
    if (result === drop) return "drop";
    if (result !== event) return { message: serializeRoomEvent(result, message) };
  });

  cable.onOutgoing((command) => {
    if (command.command !== "message" || outgoingHandlers.size === 0) return;
    const message = parseSpeak(command.data);
    if (!message) return;
    const result = runPipeline(outgoingHandlers, message);
    if (result === drop) return "drop";
    if (result !== message) return { data: serializeSpeak(result, command.data) };
  });
}

export function scopedChat(scope: Scope): ChatApi {
  const register = <H>(handlers: Set<H>, handler: H) => {
    handlers.add(handler);
    scope.add(() => handlers.delete(handler));
  };
  return {
    incoming: (handler) => register(incomingHandlers, handler),
    outgoing: (handler) => register(outgoingHandlers, handler),
  };
}
