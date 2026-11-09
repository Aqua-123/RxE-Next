import { Pipeline, type Scope } from "@/core/scope";
import { cable } from "@/platform/cable";
import { attempt } from "@/platform/log";
import { rememberGender } from "../genders";
import type { ChatEvent, OutgoingEvent } from "../model";
import {
  parseOutgoing,
  parseRoomEvent,
  parseUser,
  serializeOutgoing,
  serializeRoomEvent,
} from "../wire";

/** Return from a chat handler to stop the event: incoming ones never reach the site, outgoing ones are never sent. */
export const drop = Symbol("drop");

type IncomingHandler = (event: ChatEvent) => ChatEvent | typeof drop | undefined;
type OutgoingHandler = (event: OutgoingEvent) => OutgoingEvent | typeof drop | undefined;

export interface ChatApi {
  /** Sees every room event (group, DM, 1-on-1) before the site does; may rewrite or drop it. */
  incoming(handler: IncomingHandler): void;
  /**
   * Sees every message and typing ping you send before it leaves; may rewrite or drop it.
   * The site has already shown your message to you by then; to change what you see
   * too, use `composer.transform`.
   */
  outgoing(handler: OutgoingHandler): void;
}

const incomingHandlers = new Pipeline<IncomingHandler>();
const outgoingHandlers = new Pipeline<OutgoingHandler>();

function runPipeline<T>(
  handlers: Pipeline<(value: T) => T | typeof drop | undefined>,
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
    if (identifier.channel !== "RoomChannel") return;
    const author = parseUser(message.user);
    if (author) rememberGender(author.id, author.gender);
    if (incomingHandlers.size === 0) return;
    const event = parseRoomEvent(identifier, message);
    if (!event) return;
    const result = runPipeline(incomingHandlers, event);
    if (result === drop) return "drop";
    if (result !== event) return { message: serializeRoomEvent(result, message) };
  });

  cable.onOutgoing((command) => {
    if (command.command !== "message" || outgoingHandlers.size === 0) return;
    const event = parseOutgoing(command.data);
    if (!event) return;
    const result = runPipeline(outgoingHandlers, event);
    if (result === drop) return "drop";
    if (result !== event) return { data: serializeOutgoing(result, command.data) };
  });
}

export function scopedChat(scope: Scope): ChatApi {
  return {
    incoming: (handler) => scope.add(incomingHandlers.add(scope, handler)),
    outgoing: (handler) => scope.add(outgoingHandlers.add(scope, handler)),
  };
}
