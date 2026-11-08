/**
 * Theme colors are always hex (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`), so they can be
 * edited, mixed and exported without a browser. Values read from the site's CSSOM
 * (`rgb(…)`) are parsed here too.
 */

export type Hex = string & { readonly __brand: "Hex" };

export interface Rgba {
  r: number;
  g: number;
  b: number;
  /** 0–1 */
  a: number;
}

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i;

export function isHex(value: string): value is Hex {
  return HEX.test(value);
}

export function parseColor(value: string): Rgba | null {
  const text = value.trim();
  if (isHex(text)) {
    let digits = text.slice(1);
    if (digits.length <= 4) digits = [...digits].map((digit) => digit + digit).join("");
    const channel = (index: number) => Number.parseInt(digits.slice(index, index + 2), 16);
    return {
      r: channel(0),
      g: channel(2),
      b: channel(4),
      a: digits.length === 8 ? channel(6) / 255 : 1,
    };
  }
  const match = RGB.exec(text);
  if (!match) return null;
  const alpha = match[4];
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a:
      alpha === undefined
        ? 1
        : alpha.endsWith("%")
          ? Number.parseFloat(alpha) / 100
          : Number(alpha),
  };
}

const byte = (value: number) =>
  Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0");

export function toHex({ r, g, b, a }: Rgba): Hex {
  const alpha = a >= 1 ? "" : byte(a * 255);
  return `#${byte(r)}${byte(g)}${byte(b)}${alpha}` as Hex;
}

/** Lowercase `#rrggbb` or `#rrggbbaa`, for comparing colors. */
export function normalize(value: string): Hex | null {
  const rgba = parseColor(value);
  return rgba ? toHex(rgba) : null;
}

/** `weight` of `a` mixed into `b` (sRGB). */
export function mix(a: Hex, b: Hex, weight: number): Hex {
  const x = parseColor(a)!;
  const y = parseColor(b)!;
  const lerp = (from: number, to: number) => from * weight + to * (1 - weight);
  return toHex({ r: lerp(x.r, y.r), g: lerp(x.g, y.g), b: lerp(x.b, y.b), a: lerp(x.a, y.a) });
}

/** Multiplies the color's existing alpha by `alpha`. */
export function withAlpha(color: Hex, alpha: number): Hex {
  const rgba = parseColor(color)!;
  return toHex({ ...rgba, a: rgba.a * alpha });
}

/** The opaque `#rrggbb` part, for `<input type="color">`. */
export function opaquePart(color: Hex): Hex {
  return toHex({ ...parseColor(color)!, a: 1 });
}

export function alphaOf(color: Hex): number {
  return parseColor(color)?.a ?? 1;
}

/** Relative luminance (WCAG), 0–1. */
export function luminance(color: Hex): number {
  const { r, g, b } = parseColor(color)!;
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}
