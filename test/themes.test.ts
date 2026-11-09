import { describe, expect, test } from "bun:test";
import { SITE_TOKENS } from "../src/site/tokens";
import { BUILTIN_THEMES, DEFAULT_THEME } from "../src/themes/builtin";
import {
  contrastRatio,
  type Hex,
  mix,
  normalize,
  parseColor,
  withAlpha,
} from "../src/themes/color";
import { compileTheme } from "../src/themes/compile";
import { type Theme, themeProblem } from "../src/themes/model";
import { resolveTokens, tokensFromSeed } from "../src/themes/resolve";
import { buildTokenIndex, tokenizeRule } from "../src/themes/tokenizer";

const hex = (value: string) => normalize(value)!;
const theme = (overrides: Partial<Theme> = {}): Theme => ({ ...DEFAULT_THEME, ...overrides });

describe("color", () => {
  test("parses hex and the CSSOM's rgb() forms", () => {
    expect(parseColor("#abc")).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(parseColor("rgb(38, 40, 52)")).toEqual({ r: 38, g: 40, b: 52, a: 1 });
    expect(parseColor("rgba(255, 255, 255, 0.1)")?.a).toBeCloseTo(0.1);
  });

  test("mixes and applies alpha", () => {
    expect(mix(hex("#ffffff"), hex("#000000"), 0.5)).toBe(hex("#808080"));
    expect(withAlpha(hex("#ffffff"), 0.5)).toBe(hex("#ffffff80"));
  });
});

describe("built-in themes", () => {
  test("every built-in theme is valid and has a unique id", () => {
    for (const builtin of BUILTIN_THEMES) expect(themeProblem(builtin)).toBeNull();
    expect(new Set(BUILTIN_THEMES.map((entry) => entry.id)).size).toBe(BUILTIN_THEMES.length);
  });

  test("the default theme leaves the site's colors untouched", () => {
    const tokens = resolveTokens(DEFAULT_THEME);
    for (const token of SITE_TOKENS) expect(tokens[token.name]).toBe(hex(token.dark));
  });
});

describe("seeds", () => {
  test("an accent seed regenerates the brand ramp and picks readable text", () => {
    const tokens = tokensFromSeed(theme(), "accent", hex("#ffee00"));
    expect(tokens["primary-500"]).toBe(hex("#ffee00"));
    expect(tokens["rxe-accent-1"]).toBe(hex("#ffee00"));
    expect(tokens["rxe-accent-foreground"]).not.toBe(hex("#ffffff"));
  });

  test("a text seed derives translucent and muted text", () => {
    const tokens = tokensFromSeed(theme(), "text", hex("#ffffff"));
    expect(parseColor(tokens["primary-content-10"]!)?.a).toBeCloseTo(0.1, 1);
  });
});

describe("generated palettes stay themed and readable", () => {
  const midnight = BUILTIN_THEMES.find((entry) => entry.id === "builtin:midnight")!;
  const sakura = BUILTIN_THEMES.find((entry) => entry.id === "builtin:sakura")!;

  test("surface shades keep the surface's hue", () => {
    const chip = parseColor(resolveTokens(midnight)["base1-300"]!)!;
    expect(chip.b).toBeGreaterThan(chip.r + 15);
  });

  test("muted text reads on every surface it sits on, in dark and light themes", () => {
    for (const theme of [midnight, sakura]) {
      const tokens = resolveTokens(theme);
      for (const surface of ["base1-850", "base1-600", "base1-500", "base1-300"]) {
        expect(contrastRatio(tokens["base1-100"]!, tokens[surface]!)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  test("every opaque accent gets an on-color that reads on it", () => {
    const css = compileTheme({ theme: midnight, wallpaperUrl: null, glassTargets: [] });
    const tokens = resolveTokens(midnight);
    const on = /--rxe-on-primary-500:(#[0-9a-f]+);/.exec(css)![1] as Hex;
    expect(contrastRatio(on, tokens["primary-500"]!)).toBeGreaterThanOrEqual(4.5);
  });

  test("the default theme keeps the site's own text on accents where it reads", () => {
    const css = compileTheme({ theme: DEFAULT_THEME, wallpaperUrl: null, glassTargets: [] });
    expect(css).toContain("--rxe-on-primary-500:var(--primary-content);");
  });

  test("light-theme surface shades stay soft", () => {
    const chip = parseColor(resolveTokens(sakura)["base1-300"]!)!;
    expect(Math.max(chip.r, chip.g, chip.b) - Math.min(chip.r, chip.g, chip.b)).toBeLessThan(70);
  });
});

describe("compileTheme", () => {
  test("sets every token and the font on :root:root", () => {
    const css = compileTheme({ theme: theme(), wallpaperUrl: null, glassTargets: [] });
    expect(css).toStartWith(":root:root{");
    expect(css).toContain(`--base1-850:${hex("#262834")};`);
    expect(css).toContain("--rxe-font:Inter");
  });

  test("a wallpaper makes surfaces translucent but leaves text opaque", () => {
    const css = compileTheme({
      theme: theme({
        wallpaper: {
          source: { kind: "url", url: "https://x.test/a.png" },
          blur: 4,
          dim: 0.2,
          surfaceOpacity: 0.5,
        },
      }),
      wallpaperUrl: "https://x.test/a.png",
      glassTargets: [],
    });
    expect(css).toContain(`--base1-850:${withAlpha(hex("#262834"), 0.5)};`);
    expect(css).toContain(`--primary-content:${hex("#ffffff")};`);
    expect(css).toContain('url("https://x.test/a.png")');
  });

  test("glass lifts raised panels so their dropdowns stay above the page", () => {
    const css = compileTheme({
      theme: theme({ glass: true }),
      wallpaperUrl: null,
      glassTargets: [{ selector: ".header", raised: true }, { selector: ".panel" }],
    });
    expect(css).toContain(".header,.panel{backdrop-filter:blur(14px) saturate(140%)}");
    expect(css).toContain(".header{position:relative;z-index:1}");
  });

  test("custom CSS comes last", () => {
    const css = compileTheme({
      theme: theme({ customCss: ".x{color:var(--rxe-link)}" }),
      wallpaperUrl: null,
      glassTargets: [],
    });
    expect(css.endsWith(".x{color:var(--rxe-link)}")).toBe(true);
  });
});

describe("tokenizer", () => {
  const style = (declarations: Record<string, string>) => {
    const entries = Object.entries(declarations);
    return {
      length: entries.length,
      item: (index: number) => entries[index]![0],
      getPropertyValue: (property: string) => declarations[property] ?? "",
      getPropertyPriority: () => "",
    };
  };
  const index = buildTokenIndex();

  test("rewrites hardcoded token values to var(--token)", () => {
    expect(tokenizeRule(".panel", style({ "background-color": "rgb(38, 40, 52)" }), index)).toBe(
      ".panel{background-color:var(--base1-850)}"
    );
  });

  test("respects roles: text tokens never replace backgrounds", () => {
    expect(tokenizeRule(".a", style({ color: "rgb(255, 255, 255)" }), index)).toBe(
      ".a{color:var(--primary-content)}"
    );
    expect(
      tokenizeRule(".b", style({ "background-color": "rgb(255, 255, 255)" }), index)
    ).toBeNull();
  });

  test("text on an accent background gets that accent's readable on-color", () => {
    expect(
      tokenizeRule(
        ".chip.active",
        style({ "background-color": "var(--primary-500)", color: "var(--primary-content)" }),
        index
      )
    ).toBe(".chip.active{color:var(--rxe-on-primary-500)}");
    expect(tokenizeRule(".badge", style({ "background-color": "rgb(233, 66, 53)" }), index)).toBe(
      ".badge{background-color:var(--error-500);color:var(--rxe-on-error-500)}"
    );
  });

  test("an explicit, non-default text color on an accent is the site's choice and stays", () => {
    expect(
      tokenizeRule(
        ".gold",
        style({ "background-color": "var(--gold-btn-bg)", color: "var(--black)" }),
        index
      )
    ).toBeNull();
  });

  test("leaves non-token colors and existing variables alone", () => {
    expect(
      tokenizeRule(".c", style({ color: "rgb(1, 2, 3)", "border-top-color": "var(--x)" }), index)
    ).toBeNull();
  });
});

test("hex brand is just a string at runtime", () => {
  const value: Hex = hex("#123456");
  expect(value).toBe("#123456" as Hex);
});
