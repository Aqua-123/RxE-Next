import { describe, expect, test } from "bun:test";
import { isEmojiOnly, isPlain, parse } from "../src/features/rich-text/parse";

const options = { links: true, spoilers: true, mentionNames: ["Void", "voidexception"] };

describe("rich text parser", () => {
  test("plain text stays plain, so the site keeps rendering it", () => {
    expect(isPlain(parse("just chatting", options))).toBe(true);
  });

  test("parses nested markup", () => {
    expect(parse("**bold _and italic_** end", options)).toEqual([
      {
        type: "bold",
        children: [
          { type: "text", value: "bold " },
          { type: "italic", children: [{ type: "text", value: "and italic" }] },
        ],
      },
      { type: "text", value: " end" },
    ]);
  });

  test("code and links are never parsed for markup", () => {
    expect(parse("`**not bold**`", options)).toEqual([{ type: "code", value: "**not bold**" }]);
    expect(parse("see https://example.com/a_b_c.", options)).toEqual([
      { type: "text", value: "see " },
      { type: "link", href: "https://example.com/a_b_c" },
      { type: "text", value: "." },
    ]);
  });

  test("snake_case and multiplication are not italics", () => {
    expect(isPlain(parse("my_var_name and 2*3*4", options))).toBe(true);
  });

  test("respects disabled options", () => {
    expect(
      isPlain(parse("https://x.y ||secret||", { ...options, links: false, spoilers: false }))
    ).toBe(true);
  });

  test("highlights mentions of the reader only as whole words", () => {
    expect(parse("hey @void!", options)).toContainEqual({ type: "mention", value: "@void" });
    expect(isPlain(parse("avoid the voidexceptional", options))).toBe(true);
  });

  test("detects emoji-only messages", () => {
    expect(isEmojiOnly("😂")).toBe(true);
    expect(isEmojiOnly("👍🏽 🔥")).toBe(true);
    expect(isEmojiOnly("lol 😂")).toBe(false);
    expect(isEmojiOnly("😂😂😂😂")).toBe(false);
  });
});
