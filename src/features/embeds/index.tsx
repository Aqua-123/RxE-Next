import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import { type Embed, embedSrc, parseEmbed } from "./parse";

const COMPACT_SPOTIFY = new Set(["track", "episode"]);

function EmbedFrame({ embed }: { embed: Embed }) {
  const size =
    embed.kind === "youtube"
      ? "aspect-video w-full max-w-md"
      : COMPACT_SPOTIFY.has(embed.type)
        ? "h-20 w-full max-w-md"
        : "h-88 w-full max-w-md";
  return (
    <span className="block py-1">
      <iframe
        title={embed.kind === "youtube" ? "YouTube video" : "Spotify player"}
        src={embedSrc(embed)}
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className={`block rounded-lg border-0 ${size}`}
      />
    </span>
  );
}

export default defineFeature({
  id: "embeds",
  name: "Embeds",
  description: "Plays YouTube videos and Spotify music in chat when a message is just the link.",
  category: "chat",
  settings: {
    youtube: setting.boolean({ label: "YouTube", default: true }),
    spotify: setting.boolean({ label: "Spotify", default: true }),
  },
  setup({ messages, settings }) {
    messages.renderText((text) => {
      const embed = parseEmbed(text);
      if (!embed || !settings.get()[embed.kind]) return null;
      return <EmbedFrame embed={embed} />;
    });
    settings.watch(() => messages.refresh());
  },
});
