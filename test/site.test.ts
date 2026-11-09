import { describe, expect, test } from "bun:test";
import { parseMutedUserIds } from "../src/site/prefs";
import {
  parseComments,
  parseProfile,
  parseRoomEvent,
  parseSpeak,
  parseUser,
  parseWall,
  serializeRoomEvent,
  serializeSpeak,
} from "../src/site/wire";

const identifier = { channel: "RoomChannel", room_id: "channel97" };
const rawUser = {
  id: 7,
  display_name: "rain",
  username: "rain_",
  gender: "m",
  karma: 12,
  created_at: "2024-02-26T22:27:33",
};

describe("parseMutedUserIds", () => {
  test("reads the site's object entries and tolerates bare ids", () => {
    const raw = JSON.stringify({ muted_users: [{ id: 5, display_name: "a" }, 7, { id: "8" }] });
    expect(parseMutedUserIds(raw)).toEqual([5, 7, 8] as never);
  });

  test("tolerates missing, corrupt, and malformed values", () => {
    expect(parseMutedUserIds(null)).toEqual([]);
    expect(parseMutedUserIds("{not json")).toEqual([]);
    expect(parseMutedUserIds(JSON.stringify({ muted_users: [null, { name: "x" }] }))).toEqual([]);
  });
});

describe("wire translation", () => {
  test("parses users into the domain model", () => {
    expect(parseUser(rawUser)).toMatchObject({ id: 7, name: "rain", gender: "male", karma: 12 });
    expect(parseUser({ display_name: "no id" })).toBeNull();
  });

  test("parses each RoomChannel frame kind", () => {
    expect(
      parseRoomEvent(identifier, { messages: ["hi"], picture: null, user: rawUser })
    ).toMatchObject({
      kind: "message",
      room: "channel97",
      text: ["hi"],
    });
    expect(parseRoomEvent(identifier, { typing: true, user: rawUser })?.kind).toBe("typing");
    expect(parseRoomEvent(identifier, { user_connected: true, user: rawUser })?.kind).toBe(
      "joined"
    );
    expect(parseRoomEvent(identifier, { user_disconnected: true, user: rawUser })?.kind).toBe(
      "left"
    );
    expect(parseRoomEvent(identifier, { user_kicked: true, user_id: 7 })).toBeNull();
  });

  test("writes edited text back onto the original frame, keeping unknown fields", () => {
    const original = { messages: ["hi"], picture: null, user: rawUser, extra: 1 };
    const event = parseRoomEvent(identifier, original)!;
    expect(serializeRoomEvent({ ...event, text: ["hello"] } as never, original)).toEqual({
      ...original,
      messages: ["hello"],
    });
  });

  test("round-trips the speak action", () => {
    const data = { action: "speak", message: "hi", id: "channel97", mode: "channel" };
    const message = parseSpeak(data)!;
    expect(message).toEqual({ room: "channel97" as never, text: "hi", picture: null });
    expect(JSON.parse(JSON.stringify(serializeSpeak({ ...message, text: "yo" }, data)))).toEqual({
      ...data,
      message: "yo",
    });
  });
});

describe("profile and wall translation", () => {
  test("reads another user's wall id from their profile envelope", () => {
    const profile = parseProfile({
      user: { ...rawUser, bio: "hi", location: "India", online: true, verified: true, wall_id: 42 },
    });
    expect(profile).toMatchObject({
      id: 7,
      bio: "hi",
      location: "India",
      online: true,
      wallId: 42,
    });
  });

  test("leaves wallId null when the site omits it (your own profile, anonymized users)", () => {
    expect(parseProfile({ user: rawUser })?.wallId).toBeNull();
    expect(parseProfile({ user: { display_name: "no id" } })).toBeNull();
  });

  test("parses a wall page, dropping malformed posts and reading pagination", () => {
    const wall = parseWall({
      posts: [
        { id: 1, content: "a", likes_count: 3, comments_count: 1, author: rawUser },
        { id: 2, content: "no author" },
      ],
      pagination: { next_page: 2 },
    });
    expect(wall.items).toHaveLength(1);
    expect(wall.items[0]).toMatchObject({ id: 1, likes: 3, comments: 1 });
    expect(wall.nextPage).toBe(2);
  });

  test("parses comments and ends pagination at a null next page", () => {
    const page = parseComments({
      comments: [{ id: 9, content: "yo", author: rawUser }],
      pagination: { next_page: null },
    });
    expect(page.items[0]).toMatchObject({ id: 9, content: "yo" });
    expect(page.nextPage).toBeNull();
  });
});
