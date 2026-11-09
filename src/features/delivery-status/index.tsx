import { useState } from "react";
import { defineFeature } from "@/core/feature";
import type { RoomId } from "@/site/model";

/** The server echoes back every message it accepts; one that doesn't come back within this was dropped. */
const ECHO_TIMEOUT_MS = 8_000;

/** The server strips zero-width characters, so compare without them. */
const normalize = (text: string) => text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

interface Sent {
  room: RoomId;
  text: string;
  state: "sending" | "failed";
  cancel(): void;
}

function NotDelivered({ onEdit }: { onEdit(): void }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1.5 align-middle text-destructive text-xs">
      <span
        title="The site didn't deliver this message, probably because its filter blocked it. Only you can see it."
        className="cursor-help font-medium"
      >
        Not delivered
      </span>
      <button
        type="button"
        onClick={() => {
          setHidden(true);
          onEdit();
        }}
        className="cursor-pointer rounded-sm px-1 underline underline-offset-2 hover:text-foreground"
      >
        Edit
      </button>
    </span>
  );
}

export default defineFeature({
  id: "delivery-status",
  name: "Delivery status",
  description:
    "Marks your messages that the site silently dropped (for example by its filter) as “Not delivered”, so you know nobody saw them.",
  category: "chat",
  setup({ chat, composer, messages, site, after }) {
    const sent: Sent[] = [];

    chat.outgoing((event) => {
      if (event.kind !== "message" || !event.text.trim()) return undefined;
      const entry: Sent = {
        room: event.room,
        text: normalize(event.text),
        state: "sending",
        cancel: () => {},
      };
      entry.cancel = after(ECHO_TIMEOUT_MS, () => {
        entry.state = "failed";
        messages.refresh();
      });
      sent.push(entry);
      if (sent.length > 50) sent.splice(0, sent.length - 50);
      return undefined;
    });

    chat.incoming((event) => {
      if (event.kind !== "message" || event.author.id !== site.currentUser()?.id) return undefined;
      const text = normalize(event.text[0] ?? "");
      const index = sent.findIndex((entry) => entry.room === event.room && entry.text === text);
      if (index >= 0) {
        const [entry] = sent.splice(index, 1);
        entry!.cancel();
        if (entry!.state === "failed") messages.refresh();
      }
      return undefined;
    });

    messages.annotate(({ raw, text, author }) => {
      if (!author || author.id !== site.currentUser()?.id) return null;
      const entry = [...sent].reverse().find((candidate) => candidate.text === normalize(raw));
      if (!entry) return null;
      // Reserve a slot while sending, so the marker can appear without the site re-rendering.
      if (entry.state === "sending") return false;
      return <NotDelivered onEdit={() => composer.draft(text)} />;
    });
  },
});
