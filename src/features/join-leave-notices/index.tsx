import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import type { RoomId, UserId } from "@/site/model";

/** Connections drop and come back within seconds; only a leave that lasts this long is real. */
const LEAVE_GRACE_MS = 15_000;
/** How long the line stays, as in the old RxE. */
const SHOWN_MS = 5_000;

function Status({ name, action }: { name: string; action: "joined" | "left" }) {
  return (
    <p className="text-left text-muted-foreground text-xs italic">
      User <span className="font-medium not-italic">{name || "Someone"}</span> {action} the chat.
    </p>
  );
}

export default defineFeature({
  id: "join-leave-notices",
  name: "Join and leave notices",
  description:
    "Shows “User X joined the chat.” under group chat's last message for a few seconds. Each one replaces the last, so it never piles up.",
  category: "chat",
  settings: {
    joins: setting.boolean({ label: "Joins", default: true }),
    leaves: setting.boolean({ label: "Leaves", default: true }),
  },
  setup({ chat, messages, settings, site, after }) {
    const present = new Set<string>();
    const leaving = new Map<string, () => void>();
    const key = (room: RoomId, user: UserId) => `${room}:${user}`;

    chat.incoming((event) => {
      if (event.kind !== "joined" && event.kind !== "left") return undefined;
      const { room, user } = event;
      if (user.id === site.currentUser()?.id) return undefined;
      const id = key(room, user.id);

      if (event.kind === "joined") {
        // Back within the grace period: they never really left.
        const cancelLeave = leaving.get(id);
        if (cancelLeave) {
          cancelLeave();
          leaving.delete(id);
          return undefined;
        }
        if (present.has(id)) return undefined;
        present.add(id);
        if (settings.get().joins) {
          messages.flash(room, <Status name={user.name} action="joined" />, SHOWN_MS);
        }
        return undefined;
      }

      if (leaving.has(id)) return undefined;
      leaving.set(
        id,
        after(LEAVE_GRACE_MS, () => {
          leaving.delete(id);
          present.delete(id);
          if (settings.get().leaves) {
            messages.flash(room, <Status name={user.name} action="left" />, SHOWN_MS);
          }
        })
      );
      return undefined;
    });
  },
});
