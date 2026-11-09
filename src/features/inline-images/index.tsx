import { useState } from "react";
import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import { isGif, parseImageLink } from "./parse";

function InlineImage({ src, original }: { src: string; original: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="break-all text-link underline-offset-2 hover:underline"
      >
        {original}
      </a>
    );
  }
  return (
    <a href={src} target="_blank" rel="noopener noreferrer nofollow" className="block w-fit py-1">
      <img
        src={src}
        alt={original}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="block max-h-64 max-w-full rounded-lg object-contain sm:max-w-xs"
      />
    </a>
  );
}

export default defineFeature({
  id: "inline-images",
  name: "Inline images",
  description:
    "Shows the picture when a message is just a link to Imgur, ImgBB or Reddit's image host. Other links stay links.",
  category: "chat",
  settings: {
    gifs: setting.boolean({ label: "Show GIFs", default: true }),
  },
  setup({ messages, settings }) {
    messages.renderText((text) => {
      const src = parseImageLink(text);
      if (!src || (isGif(src) && !settings.get().gifs)) return null;
      return <InlineImage src={src} original={text.trim()} />;
    });
    settings.watch(() => messages.refresh());
  },
});
