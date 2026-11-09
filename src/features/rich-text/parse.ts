/**
 * Chat markup → a tree of inline nodes. Pure; rendering lives in RichText.tsx.
 *
 *   **bold**  *italic* / _italic_  __underline__  ~~strike~~  `code`  ||spoiler||
 *   https://links  and mentions of the reader's own name
 */

export type Inline =
  | { type: "text"; value: string }
  | { type: "bold" | "italic" | "underline" | "strike" | "spoiler"; children: Inline[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string }
  | { type: "mention"; value: string };

export interface ParseOptions {
  links: boolean;
  spoilers: boolean;
  /** Names that count as mentioning the reader (display name, username). */
  mentionNames: readonly string[];
}

interface Rule {
  pattern: RegExp;
  build(match: RegExpExecArray, options: ParseOptions): Inline;
  enabled?(options: ParseOptions): boolean;
}

const container =
  (type: "bold" | "italic" | "underline" | "strike" | "spoiler") =>
  (match: RegExpExecArray, options: ParseOptions): Inline => ({
    type,
    children: parse(match[1] ?? "", options),
  });

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Earlier rules win ties, so code and links are never parsed for markup. */
const RULES: Rule[] = [
  { pattern: /`([^`\n]+)`/, build: (match) => ({ type: "code", value: match[1] ?? "" }) },
  {
    pattern: /\bhttps?:\/\/[^\s<]+[^\s<.,:;"')\]!?]/,
    build: (match) => ({ type: "link", href: match[0] }),
    enabled: (options) => options.links,
  },
  { pattern: /\|\|(.+?)\|\|/, build: container("spoiler"), enabled: (options) => options.spoilers },
  { pattern: /\*\*(.+?)\*\*/, build: container("bold") },
  { pattern: /__(.+?)__/, build: container("underline") },
  { pattern: /~~(.+?)~~/, build: container("strike") },
  // A backslash before the opening mark keeps it literal, as in ¯\_(ツ)_/¯.
  { pattern: /(?<![*\w\\])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])/, build: container("italic") },
  { pattern: /(?<![_\w\\])_(?!\s)(.+?)(?<!\s)_(?![_\w])/, build: container("italic") },
];

function mentionRule(options: ParseOptions): Rule | null {
  const names = options.mentionNames.filter((name) => name.trim().length >= 2);
  if (names.length === 0) return null;
  const alternatives = names.map(escapeRegExp).join("|");
  return {
    pattern: new RegExp(`(?<![\\w@])@?(?:${alternatives})(?!\\w)`, "i"),
    build: (match) => ({ type: "mention", value: match[0] }),
  };
}

export function parse(text: string, options: ParseOptions): Inline[] {
  const rules = RULES.filter((rule) => rule.enabled?.(options) ?? true);
  const mention = mentionRule(options);
  if (mention) rules.push(mention);

  const nodes: Inline[] = [];
  let rest = text;
  while (rest) {
    let best: { match: RegExpExecArray; rule: Rule } | null = null;
    for (const rule of rules) {
      const match = rule.pattern.exec(rest);
      if (match && (!best || match.index < best.match.index)) best = { match, rule };
    }
    if (!best) {
      nodes.push({ type: "text", value: rest });
      break;
    }
    if (best.match.index > 0) nodes.push({ type: "text", value: rest.slice(0, best.match.index) });
    nodes.push(best.rule.build(best.match, options));
    rest = rest.slice(best.match.index + best.match[0].length);
  }
  return nodes;
}

/** True when parsing found nothing to style, so the site can keep rendering plain text. */
export function isPlain(nodes: readonly Inline[]): boolean {
  return nodes.every((node) => node.type === "text");
}

const EMOJI_ONLY =
  /^(?:\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic}|️|\p{Emoji_Modifier})*\s*){1,3}$/u;

/** One to three emoji and nothing else. */
export function isEmojiOnly(text: string): boolean {
  return EMOJI_ONLY.test(text.trim());
}
