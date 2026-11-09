import { defineFeature } from "@/core/feature";
import { disguiseLinks, revealLinks } from "@/site/disguise";

export default defineFeature({
  id: "send-links",
  name: "Send links",
  description:
    "The site silently drops messages with links. This sends them as youtu．be/… with a look-alike dot so they get through; pasted into a browser they still open, and turns them back into working links, embeds and images for RxE users.",
  category: "chat",
  setup({ composer, messages }) {
    composer.transform(disguiseLinks);
    messages.rewriteText(revealLinks);
  },
});
