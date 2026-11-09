/** EmeraldChat's domain, as features see it. Wire formats never leave `site/`. */

export type UserId = number & { readonly __brand: "UserId" };
export type RoomId = string & { readonly __brand: "RoomId" };

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
