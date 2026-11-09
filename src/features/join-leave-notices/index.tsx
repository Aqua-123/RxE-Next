import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import type { RoomId, UserId } from "@/site/model";

/** Connections drop and come back within seconds; only a leave that lasts this long is real. */
const LEAVE_GRACE_MS = 15_000;

function Notice({ name, action }: { name: string; action: "joined" | "left" }) {
  return (
    <p className="px-3 text-muted-foreground text-xs italic">
      <span className="font-medium not-italic">{name || "Someone"}</span> {action} the chat
    </p>
  );
}

export default defineFeature({
  id: "join-leave-notices",
  name: "Join and leave notices",
  description:
    "Shows a line in group chat when someone joins or leaves. Leaves show after 15 seconds, so quick reconnects don't count.",
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
        const cancelLeave = leaving.get(id);
        if (cancelLeave) {
          cancelLeave();
          leaving.delete(id);
          return undefined;
        }
        if (present.has(id)) return undefined;
        present.add(id);
        if (settings.get().joins)
          messages.notice(room, <Notice name={user.name} action="joined" />);
        return undefined;
      }

      if (leaving.has(id)) return undefined;
      leaving.set(
        id,
        after(LEAVE_GRACE_MS, () => {
          leaving.delete(id);
          present.delete(id);
          if (settings.get().leaves)
            messages.notice(room, <Notice name={user.name} action="left" />);
        })
      );
      return undefined;
    });
  },
});
