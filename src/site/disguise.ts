/**
 * The server silently drops messages containing links, domains (`hello.world`) or
 * email addresses, and any `https://`; the sender still sees them locally. Two
 * substitutions get them delivered while keeping them usable without RxE:
 *
 * - U+FF0E FULLWIDTH FULL STOP in hosts. It looks like a dot, and browsers map it
 *   to one when parsing a host, so pasting `files．catbox．moe/x%2Epng` into the
 *   address bar opens `files.catbox.moe/x.png`.
 * - `%2E` for dots in paths, which servers decode back to dots.
 *
 * RxE turns both back for its readers.
 */
export const LOOKALIKE_DOT = "\uFF0E";

/** Only the domain is disguised, so a pasted address still works in a mail app. */
const EMAIL_DOMAIN = /(?<=[\w.%+-]@)[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;
const DISGUISED_EMAIL_DOMAIN = /(?<=[\w.%+-]@)[a-z0-9-]+(?:．[a-z0-9-]+)+/gi;

const hostToLookalike = (host: string) => host.replaceAll(".", LOOKALIKE_DOT);
const hostToDots = (host: string) => host.replaceAll(LOOKALIKE_DOT, ".");

export function disguiseEmails(text: string): string {
  return text.replace(EMAIL_DOMAIN, hostToLookalike);
}

export function revealEmails(text: string): string {
  return text.replace(DISGUISED_EMAIL_DOMAIN, hostToDots);
}

/** Trailing punctuation belongs to the sentence, not the link. */
const URL_WITH_SCHEME = /\bhttps?:\/\/[^\s<]*[^\s<.,:;"')\]!?]/gi;
const BARE_DOMAIN =
  /(?<![\w@./])(?:[a-z0-9-]+\.)+[a-z]{2,24}(?:\/[^\s<]*[^\s<.,:;"')\]!?])?(?![\w@])/gi;

function disguiseUrl(url: string): string {
  const bare = url.replace(/^https?:\/\//i, "");
  const slash = bare.indexOf("/");
  if (slash < 0) return hostToLookalike(bare);
  return hostToLookalike(bare.slice(0, slash)) + bare.slice(slash).replaceAll(".", "%2E");
}

/** `https://files.catbox.moe/x.png` → `files．catbox．moe/x%2Epng`. Emails are left to `disguiseEmails`. */
export function disguiseLinks(text: string): string {
  return text.replace(URL_WITH_SCHEME, disguiseUrl).replace(BARE_DOMAIN, disguiseUrl);
}

const DISGUISED_LINK =
  /(?<![\w@．/])((?:[a-z0-9-]+．)+[a-z]{2,24})(\/[^\s<]*[^\s<.,:;"')\]!?．])?(?![\w@．])/gi;

/** Common top-level domains, so a disguised `hello．world` without a path isn't taken for a site. */
const COMMON_TLDS = new Set(
  "com net org io co me be gg tv ly app dev xyz uk de fr in us ca au it nl jp ru br es eu info moe".split(
    " "
  )
);

/** `files．catbox．moe/x%2Epng` → `https://files.catbox.moe/x.png`, wherever the result is a plausible link. */
export function revealLinks(text: string): string {
  return text.replace(DISGUISED_LINK, (whole, host: string, path: string | undefined) => {
    const tld = host.slice(host.lastIndexOf(LOOKALIKE_DOT) + 1).toLowerCase();
    if (!path && !COMMON_TLDS.has(tld)) return whole;
    return `https://${hostToDots(host)}${path ? path.replace(/%2E/gi, ".") : ""}`;
  });
}
