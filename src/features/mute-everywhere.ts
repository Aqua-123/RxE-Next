import { mutedUserIds, onSitePrefsChange } from "../core/site-prefs";
import { cable } from "../platform/cable";
import { injectStyle } from "../platform/dom";
import { defineFeature } from "./feature";

const MESSAGE_ROW = '[class*="room_global_textContainer__"]';

function hideRenderedMessages(): () => void {
  const selectors = [...mutedUserIds()].map((id) => `${MESSAGE_ROW}[data-user-id="${id}"]`);
  return injectStyle(
    "mute-everywhere",
    selectors.length ? `${selectors.join(",\n")} { display: none !important; }` : ""
  );
}

export default defineFeature({
  id: "mute-everywhere",
  name: "Mute everywhere",
  description:
    "Applies your muted users to DMs and 1-on-1 chats (the site only enforces mutes in group chat), and hides their typing indicators and earlier messages.",
  defaultEnabled: true,
  requires: ["cable"],
  setup() {
    const stopFiltering = cable.onIncoming(({ identifier, message }) => {
      if (identifier.channel !== "RoomChannel") return;
      const id = message.user?.id;
      const isChatter = message.messages || message.typing || message.picture;
      if (isChatter && mutedUserIds().has(id)) return "drop";
    });

    let removeStyle = hideRenderedMessages();
    const stopWatching = onSitePrefsChange(() => {
      removeStyle = hideRenderedMessages();
    });

    return () => {
      stopFiltering();
      stopWatching();
      removeStyle();
    };
  },
});
