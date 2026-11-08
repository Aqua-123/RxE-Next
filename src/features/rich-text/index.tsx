import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import { isEmojiOnly, isPlain, parse } from "./parse";
import { BigEmoji, RichText } from "./RichText";

export default defineFeature({
  id: "rich-text",
  name: "Rich text",
  description:
    "Formats **bold**, *italic*, __underline__, ~~strike~~, `code` and ||spoilers||, makes links clickable and highlights mentions of you. Applies to new messages.",
  category: "chat",
  settings: {
    links: setting.boolean({ label: "Clickable links", default: true }),
    spoilers: setting.boolean({
      label: "Spoilers",
      description: "Hide ||text|| until clicked.",
      default: true,
    }),
    mentions: setting.boolean({ label: "Highlight mentions of you", default: true }),
    bigEmoji: setting.boolean({
      label: "Big emoji",
      description: "Enlarge messages that are only emoji.",
      default: true,
    }),
  },
  setup({ messages, settings, site }) {
    messages.renderText((text) => {
      const options = settings.get();
      if (options.bigEmoji && isEmojiOnly(text)) return <BigEmoji text={text} />;
      const me = site.currentUser();
      const nodes = parse(text, {
        links: options.links,
        spoilers: options.spoilers,
        mentionNames: options.mentions && me ? [me.name, me.username] : [],
      });
      return isPlain(nodes) ? null : <RichText nodes={nodes} />;
    });
    settings.watch(() => messages.refresh());
  },
});
