import { mutedUserIds, mutedUsers, onSitePrefsChange, writeMutedUsersBeforeMount } from "../core/site-prefs";
import { legacyStore, store } from "../core/storage";
import { cable } from "../platform/cable";
import { injectStyle } from "../platform/dom";
import { log } from "../platform/log";
import { defineFeature } from "./feature";

const MESSAGE_ROW = '[class*="room_global_textContainer__"]';
const MIGRATION_KEY = "migrated:permaMuteList";

function siteHasMounted(): boolean {
  return Boolean(document.getElementById("__next")?.firstElementChild);
}

/** Moves the old RxE perma-mute list into the site's own muted users, once. */
function importLegacyPermaMutes(): void {
  if (store.get(MIGRATION_KEY, false)) return;
  const legacy = legacyStore.get<Array<[number, string]>>("permaMuteList", []);
  if (legacy.length === 0) {
    store.set(MIGRATION_KEY, true);
    return;
  }
  // The site snapshots its preferences on mount, so a later write would be lost. Retry next load.
  if (siteHasMounted()) return;

  const existing = mutedUsers();
  const known = new Set(existing.map((user) => user.id));
  const imported = legacy
    .filter(([id]) => !known.has(id))
    .map(([id, display_name]) => ({ id, display_name }));
  writeMutedUsersBeforeMount([...existing, ...imported]);
  store.set(MIGRATION_KEY, true);
  log.info(`Imported ${imported.length} perma-muted users from RxE`);
}

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
    "Applies your muted users to DMs and 1-on-1 chats (the site only enforces mutes in group chat), hides their typing indicators and earlier messages, and imports your old RxE perma-mute list.",
  defaultEnabled: true,
  requires: ["cable"],
  setup() {
    importLegacyPermaMutes();

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
