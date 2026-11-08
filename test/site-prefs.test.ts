import { describe, expect, test } from "bun:test";
import { parseMutedUsers } from "../src/core/site-prefs";

describe("parseMutedUsers", () => {
  test("reads the site's object entries", () => {
    const raw = JSON.stringify({ muted_users: [{ id: 5, display_name: "a" }] });
    expect(parseMutedUsers(raw)).toEqual([{ id: 5, display_name: "a" }]);
  });

  test("accepts bare ids and numeric strings", () => {
    const raw = JSON.stringify({ muted_users: [7, { id: "8" }] });
    expect(parseMutedUsers(raw).map((user) => user.id)).toEqual([7, 8]);
  });

  test("tolerates missing, corrupt, and malformed values", () => {
    expect(parseMutedUsers(null)).toEqual([]);
    expect(parseMutedUsers("{not json")).toEqual([]);
    expect(parseMutedUsers(JSON.stringify({ muted_users: [null, { name: "x" }] }))).toEqual([]);
  });
});
