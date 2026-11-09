/** EmeraldChat's domain, as features see it. Wire formats never leave `site/`. */

export type UserId = number & { readonly __brand: "UserId" };
export type RoomId = string & { readonly __brand: "RoomId" };
export type WallId = number & { readonly __brand: "WallId" };

export type Gender = "male" | "female" | "other" | "unknown";

export interface User {
  id: UserId;
  name: string;
  username: string;
  gender: Gender;
  karma: number;
  createdAt: Date | null;
  avatar: string | null;
  flairColor: string | null;
  isMod: boolean;
  isGold: boolean;
}

/** A user's full profile, as returned when you open their card. */
export interface Profile extends User {
  bio: string | null;
  location: string | null;
  online: boolean;
  lastSeen: Date | null;
  verified: boolean;
  /** Their wall's id, needed to read their posts. Null for anonymized users. */
  wallId: WallId | null;
}

/** One status update on a user's wall. */
export interface Post {
  id: number;
  content: string;
  createdAt: Date | null;
  likes: number;
  liked: boolean;
  comments: number;
  author: User;
}

export interface Comment {
  id: number;
  content: string;
  createdAt: Date | null;
  likes: number;
  author: User;
}

/** One page of a paginated list, with the next page number or null at the end. */
export interface Paged<T> {
  items: readonly T[];
  nextPage: number | null;
}

export type ChatEvent =
  | { kind: "message"; room: RoomId; author: User; text: readonly string[]; picture: string | null }
  | { kind: "typing"; room: RoomId; author: User }
  | { kind: "joined"; room: RoomId; user: User }
  | { kind: "left"; room: RoomId; user: User };

export interface OutgoingMessage {
  room: RoomId;
  text: string;
  picture: string | null;
}
