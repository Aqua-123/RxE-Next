/**
 * Image hosts whose direct links serve only the image, so showing one can't log the
 * reader's IP for a third party. Anything else stays a plain link.
 */
const DIRECT: readonly RegExp[] = [
  /^i\.imgur\.com\/[A-Za-z0-9]{5,10}\.(?:png|jpe?g|gif|webp)$/i,
  /^i\.ibb\.co\/[A-Za-z0-9]+\/[\w.-]+\.(?:png|jpe?g|gif|webp)$/i,
  /^i\.redd\.it\/[A-Za-z0-9]+\.(?:png|jpe?g|gif|webp)$/i,
  /^files\.catbox\.moe\/[a-z0-9]{6}\.(?:png|jpe?g|gif|webp)$/i,
  /^sxcu\.net\/[A-Za-z0-9]{5,12}\.(?:png|jpe?g|gif|webp)$/i,
];

/** `imgur.com/<id>` pages: the image itself is `i.imgur.com/<id>.png` whatever its real type. */
const IMGUR_PAGE = /^(?:www\.|m\.)?imgur\.com\/([A-Za-z0-9]{5,10})$/i;

/** The image to show when the whole message is one link to an allowed image, otherwise null. */
export function parseImageLink(text: string): string | null {
  const trimmed = text.trim();
  if (/\s/.test(trimmed)) return null;
  const bare = trimmed.replace(/^https?:\/\//i, "").replace(/[?#].*$/, "");
  if (DIRECT.some((pattern) => pattern.test(bare))) return `https://${bare}`;
  const page = IMGUR_PAGE.exec(bare);
  return page ? `https://i.imgur.com/${page[1]}.png` : null;
}

export function isGif(src: string): boolean {
  return /\.gif$/i.test(src);
}
