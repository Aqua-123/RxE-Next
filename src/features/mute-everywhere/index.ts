import { defineFeature } from "@/core/feature";
import { drop } from "@/site/surfaces/chat";

export default defineFeature({
  id: "mute-everywhere",
  name: "Mute everywhere",
  description:
    "Applies your muted users to DMs and 1-on-1 chats (the site only enforces mutes in group chat), and hides their typing indicators and earlier messages.",
  category: "chat",
  setup({ chat, messages, site }) {
    chat.incoming((event) => {
      if ((event.kind === "message" || event.kind === "typing") && site.mutes.has(event.author.id)) {
        return drop;
      }
    });
    site.mutes.watch((ids) => messages.hideAuthors(ids));
  },
});
