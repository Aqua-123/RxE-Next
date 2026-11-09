import { describe, expect, test } from "bun:test";
import { expandCommand } from "../src/features/chat-commands/commands";
import { embedSrc, parseEmbed } from "../src/features/embeds/parse";
import { isGif, parseImageLink } from "../src/features/inline-images/parse";
import { compilePatterns } from "../src/features/mute-by-name";
import { parse } from "../src/features/rich-text/parse";
import { applyTextStyles } from "../src/features/text-styles/styles";

describe("chat commands", () => {
  test("expand a whole-message command, sending any text after it first", () => {
    expect(expandCommand(".shrug")).toBe("¯\\_(ツ)_/¯");
    expect(expandCommand(".tableflip  why ")).toBe("why (╯°□°）╯︵ ┻━┻");
  });

  test("leave everything else alone", () => {
    expect(expandCommand("hi .shrug")).toBeNull();
    expect(expandCommand(".shrugs")).toBeNull();
    expect(expandCommand(".constructor")).toBeNull();
    expect(expandCommand("...")).toBeNull();
  });

  test("the shrug survives rich text instead of turning into italics", () => {
    expect(parse("¯\\_(ツ)_/¯", { links: true, spoilers: true, mentionNames: [] })).toEqual([
      { type: "text", value: "¯\\_(ツ)_/¯" },
    ]);
  });
});

describe("text styles", () => {
  test("styles each delimiter", () => {
    expect(applyTextStyles("~hi~ ^^up^^ ((ok)) [[go]] {{old}} ,,hey,,")).toBe(
      "ʜɪ ᵘᵖ ⓞⓚ 🅶🅾 𝖔𝖑𝖉 ԋҽყ"
    );
    expect(applyTextStyles("<so> <<bold>>")).toBe("𝓈𝑜 𝓫𝓸𝓵𝓭");
  });

  test("leaves rich text markup, comparisons and code alone", () => {
    for (const text of [
      "~~strike~~",
      "2 < 3 > 1",
      "i <3 you",
      "a ~ b ~ c",
      "`~raw~`",
      "https://x.y/~user~",
    ]) {
      expect(applyTextStyles(text)).toBe(text);
    }
  });

  test("keeps delimiters around text with nothing to restyle", () => {
    expect(applyTextStyles("<3>")).toBe("<3>");
  });
});

describe("embeds", () => {
  test("recognize YouTube links in their usual shapes", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://m.youtube.com/shorts/dQw4w9WgXcQ",
      "https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=x",
    ]) {
      expect(parseEmbed(url)).toEqual({ kind: "youtube", id: "dQw4w9WgXcQ", start: null });
    }
    const timed = parseEmbed("https://youtu.be/dQw4w9WgXcQ?t=1m30s")!;
    expect(embedSrc(timed)).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90");
  });

  test("recognize Spotify links, including localized ones", () => {
    const embed = parseEmbed("https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC?si=1")!;
    expect(embedSrc(embed)).toBe("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC");
  });

  test("only when the message is just the link", () => {
    expect(parseEmbed("look https://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(parseEmbed("https://evil.example/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("inline images", () => {
  test("allows direct links on known image hosts", () => {
    expect(parseImageLink("https://i.imgur.com/abc1234.gif")).toBe(
      "https://i.imgur.com/abc1234.gif"
    );
    expect(parseImageLink("i.redd.it/x9y8z7.jpeg")).toBe("https://i.redd.it/x9y8z7.jpeg");
    expect(parseImageLink("https://i.ibb.co/Ab12/cat-pic.png")).toBe(
      "https://i.ibb.co/Ab12/cat-pic.png"
    );
    expect(parseImageLink("https://imgur.com/abc1234")).toBe("https://i.imgur.com/abc1234.png");
    expect(isGif("https://i.imgur.com/abc1234.gif")).toBe(true);
  });

  test("rejects other hosts, albums and messages with more than the link", () => {
    expect(parseImageLink("https://iplogger.example/cat.png")).toBeNull();
    expect(parseImageLink("https://imgur.com/a/abc1234")).toBeNull();
    expect(parseImageLink("cute https://i.imgur.com/abc1234.png")).toBeNull();
  });
});

describe("mute by name", () => {
  test("compiles one case-insensitive pattern per line and skips invalid ones", () => {
    const patterns = compilePatterns("^bot\n\n  [broken\nfree nitro  ");
    expect(patterns.map(String)).toEqual(["/^bot/i", "/free nitro/i"]);
    expect(patterns[0]!.test("BOTman")).toBe(true);
  });
});
