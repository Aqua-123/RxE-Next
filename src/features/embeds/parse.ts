export type Embed =
  | { kind: "youtube"; id: string; start: number | null }
  | { kind: "spotify"; type: SpotifyType; id: string };

export type SpotifyType = "track" | "album" | "playlist" | "episode" | "show" | "artist";

function parseUrl(text: string): URL | null {
  const trimmed = text.trim();
  if (/\s/.test(trimmed) || !/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

/** `t=90`, `t=1m30s`, `start=90` → seconds. */
function parseStart(url: URL): number | null {
  const value = url.searchParams.get("t") ?? url.searchParams.get("start");
  if (!value) return null;
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(value);
  if (!match?.[0]) return null;
  const [, h = "0", m = "0", s = "0"] = match;
  return Number(h) * 3600 + Number(m) * 60 + Number(s) || null;
}

const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = /^(?:www\.|m\.|music\.)?youtube(?:-nocookie)?\.com$/;

function youtube(url: URL): Embed | null {
  const host = url.hostname.toLowerCase();
  let id: string | undefined;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (YOUTUBE_HOSTS.test(host)) {
    const [first, second] = url.pathname.split("/").filter(Boolean);
    if (first === "watch") id = url.searchParams.get("v") ?? undefined;
    else if (first === "embed" || first === "shorts" || first === "live" || first === "v")
      id = second;
  }
  if (!id || !YOUTUBE_ID.test(id)) return null;
  return { kind: "youtube", id, start: parseStart(url) };
}

const SPOTIFY_TYPES = new Set<string>(["track", "album", "playlist", "episode", "show", "artist"]);

function spotify(url: URL): Embed | null {
  if (url.hostname.toLowerCase() !== "open.spotify.com") return null;
  // Localized links carry a prefix: /intl-de/track/…
  const parts = url.pathname.split("/").filter((part) => part && !part.startsWith("intl-"));
  const [type, id] = parts[0] === "embed" ? parts.slice(1) : parts;
  if (!type || !id || !SPOTIFY_TYPES.has(type) || !/^[A-Za-z0-9]{22}$/.test(id)) return null;
  return { kind: "spotify", type: type as SpotifyType, id };
}

/** An embed when the whole message is one YouTube or Spotify link, otherwise null. */
export function parseEmbed(text: string): Embed | null {
  const url = parseUrl(text);
  return url ? (youtube(url) ?? spotify(url)) : null;
}

export function embedSrc(embed: Embed): string {
  if (embed.kind === "youtube") {
    const start = embed.start ? `?start=${embed.start}` : "";
    return `https://www.youtube-nocookie.com/embed/${embed.id}${start}`;
  }
  return `https://open.spotify.com/embed/${embed.type}/${embed.id}`;
}
