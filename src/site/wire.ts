import type { ChannelIdentifier, CableMessage } from "@/platform/cable";
import type { ChatEvent, Gender, OutgoingMessage, RoomId, User, UserId } from "./model";

/**
 * EmeraldChat's wire formats and their translation to the domain model. The only
 * module that knows field names like `display_name` or `user_connected`.
 */

export interface RawUser {
  id: number;
  display_name?: string;
  username?: string;
  gender?: string;
  karma?: number;
  created_at?: string;
  display_picture?: string | null;
  flair?: { color?: string } | null;
  mod?: boolean;
  gold?: boolean;
}

const GENDERS: Record<string, Gender> = { m: "male", f: "female", o: "other" };

export function parseUser(raw: unknown): User | null {
  const user = raw as RawUser | null;
  if (typeof user?.id !== "number") return null;
  const createdAt = user.created_at ? new Date(user.created_at) : null;
  return {
    id: user.id as UserId,
    name: user.display_name ?? "",
    username: user.username ?? "",
    gender: GENDERS[user.gender ?? ""] ?? "unknown",
    karma: user.karma ?? 0,
    createdAt: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt : null,
    avatar: user.display_picture ?? null,
    flairColor: user.flair?.color || null,
    isMod: Boolean(user.mod),
    isGold: Boolean(user.gold),
  };
}

/** RoomChannel frames: `{ messages, picture, user }`, `{ typing, user }`, `{ user_connected, user }`, … */
export function parseRoomEvent(identifier: ChannelIdentifier, message: CableMessage): ChatEvent | null {
  const room = String(identifier.room_id ?? "") as RoomId;
  const user = parseUser(message.user);
  if (!room || !user) return null;
  if (Array.isArray(message.messages)) {
    return { kind: "message", room, author: user, text: message.messages.map(String), picture: message.picture ?? null };
  }
  if (message.typing) return { kind: "typing", room, author: user };
  if (message.user_connected) return { kind: "joined", room, user };
  if (message.user_disconnected) return { kind: "left", room, user };
  return null;
}

/** Writes the editable parts of an event (text, picture) back onto the original frame. */
export function serializeRoomEvent(event: ChatEvent, original: CableMessage): CableMessage {
  if (event.kind !== "message") return original;
  return { ...original, messages: [...event.text], picture: event.picture };
}

/** The `speak` action: `{ action: "speak", message, id, mode, picture? }`. */
export function parseSpeak(data: CableMessage): OutgoingMessage | null {
  if (data.action !== "speak" || typeof data.id !== "string") return null;
  return { room: data.id as RoomId, text: String(data.message ?? ""), picture: data.picture ?? null };
}

export function serializeSpeak(message: OutgoingMessage, original: CableMessage): CableMessage {
  return { ...original, message: message.text, picture: message.picture ?? undefined };
}
