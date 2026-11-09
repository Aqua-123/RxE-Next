import type { CableMessage, ChannelIdentifier } from "@/platform/cable";
import type { ChatEvent, Conversation, Gender, OutgoingEvent, RoomId, User, UserId } from "./model";

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

const stringOrNull = (value: unknown): string | null => (typeof value === "string" ? value : null);

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
export function parseRoomEvent(
  identifier: ChannelIdentifier,
  message: CableMessage
): ChatEvent | null {
  const room = String(identifier.room_id ?? "") as RoomId;
  const user = parseUser(message.user);
  if (!room || !user) return null;
  if (Array.isArray(message.messages)) {
    return {
      kind: "message",
      room,
      author: user,
      text: message.messages.map(String),
      picture: stringOrNull(message.picture),
    };
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

/**
 * The `speak` action `{ action: "speak", message, id, mode, picture? }` and `{ action: "typing", id }`.
 * Group chat ids are strings (`"channel91"`), DM ids numbers.
 */
export function parseOutgoing(data: CableMessage): OutgoingEvent | null {
  if (typeof data.id !== "string" && typeof data.id !== "number") return null;
  const room = String(data.id) as RoomId;
  if (data.action === "typing") return { kind: "typing", room };
  if (data.action !== "speak") return null;
  return {
    kind: "message",
    room,
    text: String(data.message ?? ""),
    picture: stringOrNull(data.picture),
  };
}

export function serializeOutgoing(event: OutgoingEvent, original: CableMessage): CableMessage {
  if (event.kind !== "message") return original;
  return { ...original, message: event.text, picture: event.picture ?? undefined };
}

/** `GET /api/v1/user/friends/messages`: `{ messages: [{ user_data, message: { content, picture, seen, self_msg } }] }`. */
export function parseConversations(body: unknown): Conversation[] {
  const list = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(list)) return [];
  return list.flatMap((entry) => {
    const raw = entry as {
      user_data?: { online?: unknown };
      message?: Record<string, unknown> | null;
    };
    const user = parseUser(raw.user_data);
    if (!user) return [];
    const message = raw.message ?? {};
    const content = typeof message.content === "string" && message.content ? message.content : null;
    return [
      {
        user: { ...user, online: Boolean(raw.user_data?.online) },
        preview: content,
        fromMe: Boolean(message.self_msg),
        unread: !message.self_msg && message.seen === false,
      },
    ];
  });
}
