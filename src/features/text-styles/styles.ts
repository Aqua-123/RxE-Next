/**
 * Unicode look-alike styles, applied to what you send so everyone sees them, with
 * or without RxE. Delimiters that rich text renders (**, *, _, __, ~~, `, ||) are
 * left alone so the two features never fight over the same markup.
 *
 *   ~smallcaps~  ^^superscript^^  ,,hooked,,  <cursive>  <<bold cursive>>
 *   [[squared]]  ((circled))  {{medieval}}
 */

const PLAIN = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Glyphs line up with PLAIN; a shorter table leaves the remaining characters unchanged. */
function table(glyphs: string): ReadonlyMap<string, string> {
  const plain = Array.from(PLAIN);
  return new Map(Array.from(glyphs).map((glyph, index) => [plain[index]!, glyph]));
}

const SMALLCAPS = "ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ";
const HOOKED = "αႦƈԃҽϝɠԋιʝƙʅɱɳσρϙɾʂƚυʋɯxყȥ";
const NEGATIVE_SQUARED = "🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉";

const TABLES = {
  smallcaps: table(SMALLCAPS + SMALLCAPS),
  superscript: table("ᵃᵇᶜᵈᵉᶠᵍʰᶦʲᵏˡᵐⁿᵒᵖᵠʳˢᵗᵘᵛʷˣʸᶻᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᵠᴿˢᵀᵁⱽᵂˣʸᶻ⁰¹²³⁴⁵⁶⁷⁸⁹"),
  hooked: table(HOOKED + HOOKED),
  cursive: table("𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏𝒜𝐵𝒞𝒟𝐸𝐹𝒢𝐻𝐼𝒥𝒦𝐿𝑀𝒩𝒪𝒫𝒬𝑅𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵"),
  boldCursive: table("𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩"),
  squared: table(NEGATIVE_SQUARED + NEGATIVE_SQUARED),
  circled: table("ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ⓪①②③④⑤⑥⑦⑧⑨"),
  medieval: table("𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅"),
} satisfies Record<string, ReadonlyMap<string, string>>;

export type TextStyle = keyof typeof TABLES;

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Delimiters must open at the start of a word and close at its end, with no space
 * inside them, so `2 < 3 > 1`, `~~strike~~` and `<<double>>` aren't misread as `<…>` or `~…~`.
 */
function rule(open: string, close: string, style: TextStyle) {
  const notOpen = open.length === 1 ? `(?!${escapeRegExp(open)})` : "";
  const notClose = close.length === 1 ? `(?<!${escapeRegExp(close)})` : "";
  const pattern = new RegExp(
    `(?<=^|[\\s("'])${escapeRegExp(open)}${notOpen}(?!\\s)(.+?)(?<!\\s)${notClose}${escapeRegExp(close)}(?=$|[\\s.,;:!?)"'])`,
    "g"
  );
  return { pattern, style };
}

/** Longer delimiters first, so `<<x>>` is bold cursive rather than cursive `<x>` inside `<…>`. */
const RULES = [
  rule("<<", ">>", "boldCursive"),
  rule("[[", "]]", "squared"),
  rule("((", "))", "circled"),
  rule("{{", "}}", "medieval"),
  rule("^^", "^^", "superscript"),
  rule(",,", ",,", "hooked"),
  rule("<", ">", "cursive"),
  rule("~", "~", "smallcaps"),
];

export function stylize(text: string, style: TextStyle): string {
  const glyphs = TABLES[style];
  return Array.from(text, (char) => glyphs.get(char) ?? char).join("");
}

/** Code spans and links are sent exactly as typed. */
const PROTECTED = /(`[^`\n]*`|\bhttps?:\/\/\S+)/;

export function applyTextStyles(text: string): string {
  return text
    .split(PROTECTED)
    .map((segment, index) => {
      if (index % 2 === 1) return segment;
      return RULES.reduce(
        (result, { pattern, style }) =>
          result.replace(pattern, (whole, inner: string) => {
            const styled = stylize(inner, style);
            // Nothing to restyle (`<3>`, `((?!))`): keep the delimiters, they were probably meant literally.
            return styled === inner ? whole : styled;
          }),
        segment
      );
    })
    .join("");
}
