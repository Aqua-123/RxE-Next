import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import type { UserId } from "@/site/model";
import { drop } from "@/site/surfaces/chat";

export default defineFeature({
  id: "mute-everywhere",
  name: "Mute everywhere",
  description:
    "Applies your muted users to DMs and 1-on-1 chats. The site only enforces mutes in group chat.",
  category: "chat",
  settings: {
    hideTyping: setting.boolean({ label: "Hide their typing indicators", default: true }),
    hideEarlier: setting.boolean({
      label: "Hide their earlier messages",
      description: "Also hides messages already on screen when you mute someone.",
      default: true,
    }),
  },
  setup({ chat, messages, site, settings }) {
    chat.incoming((event) => {
      if (event.kind === "message" && site.mutes.has(event.author.id)) return drop;
      if (event.kind === "typing" && settings.get().hideTyping && site.mutes.has(event.author.id))
        return drop;
      return undefined;
    });

    let muted: ReadonlySet<UserId> = new Set();
    const applyHidden = () => messages.hideAuthors(settings.get().hideEarlier ? muted : []);
    site.mutes.watch((ids) => {
      muted = ids;
      applyHidden();
    });
    settings.watch(applyHidden);
  },
});
