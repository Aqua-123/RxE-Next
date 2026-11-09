import type { CableMessage, ChannelIdentifier } from "@/platform/cable";
import type {
  ChatEvent,
  Comment,
  Gender,
  OutgoingMessage,
  Paged,
  Post,
  Profile,
  RoomId,
  User,
  UserId,
  WallId,
} from "./model";

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

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseUser(raw: unknown): User | null {
  const user = raw as RawUser | null;
  if (typeof user?.id !== "number") return null;
  return {
    id: user.id as UserId,
    name: user.display_name ?? "",
    username: user.username ?? "",
    gender: GENDERS[user.gender ?? ""] ?? "unknown",
    karma: user.karma ?? 0,
    createdAt: parseDate(user.created_at),
    avatar: user.display_picture ?? null,
    flairColor: user.flair?.color || null,
    isMod: Boolean(user.mod),
    isGold: Boolean(user.gold),
  };
}

interface RawProfile extends RawUser {
  bio?: string | null;
  location?: string | null;
  online?: boolean;
  verified?: boolean;
  last_logged_in_at?: string | null;
  wall_id?: number | null;
}

/** `/user/profile?id=…` → `{ user: {…} }`. Other users' payloads carry `wall_id`; your own omits it. */
export function parseProfile(raw: unknown): Profile | null {
  const envelope = raw as { user?: unknown } | null;
  const profile = (envelope?.user ?? raw) as RawProfile | null;
  const user = parseUser(profile);
  if (!user || !profile) return null;
  return {
    ...user,
    bio: profile.bio ?? null,
    location: profile.location ?? null,
    online: Boolean(profile.online),
    lastSeen: parseDate(profile.last_logged_in_at),
    verified: Boolean(profile.verified),
    wallId: typeof profile.wall_id === "number" ? (profile.wall_id as WallId) : null,
  };
}

interface RawPost {
  id?: number;
  content?: string;
  created_at?: string;
  likes_count?: number;
  liked?: boolean;
  comments_count?: number;
  author?: unknown;
}

function parsePost(raw: unknown): Post | null {
  const post = raw as RawPost | null;
  const author = parseUser(post?.author);
  if (typeof post?.id !== "number" || !author) return null;
  return {
    id: post.id,
    content: post.content ?? "",
    createdAt: parseDate(post.created_at),
    likes: post.likes_count ?? 0,
    liked: Boolean(post.liked),
    comments: post.comments_count ?? 0,
    author,
  };
}

function parseComment(raw: unknown): Comment | null {
  const comment = raw as RawPost | null;
  const author = parseUser(comment?.author);
  if (typeof comment?.id !== "number" || !author) return null;
  return {
    id: comment.id,
    content: comment.content ?? "",
    createdAt: parseDate(comment.created_at),
    likes: comment.likes_count ?? 0,
    author,
  };
}

interface RawPagination {
  next_page?: number | null;
}

function parsePage<T>(
  items: unknown,
  pagination: unknown,
  parse: (raw: unknown) => T | null
): Paged<T> {
  const list = Array.isArray(items)
    ? items.map(parse).filter((item): item is T => item !== null)
    : [];
  const next = (pagination as RawPagination | null)?.next_page;
  return { items: list, nextPage: typeof next === "number" ? next : null };
}

/** `/user/posts/v2` → `{ posts, pagination }`. */
export function parseWall(raw: unknown): Paged<Post> {
  const data = raw as { posts?: unknown; pagination?: unknown } | null;
  return parsePage(data?.posts, data?.pagination, parsePost);
}

/** `/user/posts/commentsv2` → `{ comments, pagination }`. */
export function parseComments(raw: unknown): Paged<Comment> {
  const data = raw as { comments?: unknown; pagination?: unknown } | null;
  return parsePage(data?.comments, data?.pagination, parseComment);
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

/** The `speak` action: `{ action: "speak", message, id, mode, picture? }`. */
export function parseSpeak(data: CableMessage): OutgoingMessage | null {
  if (data.action !== "speak" || typeof data.id !== "string") return null;
  return {
    room: data.id as RoomId,
    text: String(data.message ?? ""),
    picture: stringOrNull(data.picture),
  };
}

export function serializeSpeak(message: OutgoingMessage, original: CableMessage): CableMessage {
  return { ...original, message: message.text, picture: message.picture ?? undefined };
}
