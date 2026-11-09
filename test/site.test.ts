import { describe, expect, test } from "bun:test";
import { parseMutedUserIds } from "../src/site/prefs";
import {
  parseOutgoing,
  parseRoomEvent,
  parseUser,
  serializeOutgoing,
  serializeRoomEvent,
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
    const message = parseOutgoing(data)!;
    expect(message).toEqual({
      kind: "message",
      room: "channel97" as never,
      text: "hi",
      picture: null,
    });
    expect(
      JSON.parse(JSON.stringify(serializeOutgoing({ ...message, text: "yo" } as never, data)))
    ).toEqual({ ...data, message: "yo" });
  });

  test("DM room ids are numbers on the wire and strings in the model", () => {
    expect(parseOutgoing({ action: "typing", id: 12934566 })).toEqual({
      kind: "typing",
      room: "12934566" as never,
    });
    const data = { action: "speak", message: "hi", id: 12934566, mode: "private" };
    expect(serializeOutgoing({ ...parseOutgoing(data)!, text: "yo" } as never, data)).toEqual({
      ...data,
      message: "yo",
    });
  });

  test("parses typing pings and leaves them untouched on the way out", () => {
    const data = { action: "typing", id: "channel97" };
    const event = parseOutgoing(data)!;
    expect(event).toEqual({ kind: "typing", room: "channel97" as never });
    expect(serializeOutgoing(event, data)).toBe(data);
  });
});
