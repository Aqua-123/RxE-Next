import { defineFeature } from "@/core/feature";

const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const date = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const full = new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" });

const startOfDay = (when: Date) => new Date(when.getFullYear(), when.getMonth(), when.getDate());

/** "14:32", "Yesterday 14:32" or "9 Nov 14:32". */
export function formatMessageTime(when: Date, now = new Date()): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(when).getTime()) / 86_400_000);
  if (days <= 0) return time.format(when);
  if (days === 1) return `Yesterday ${time.format(when)}`;
  return `${date.format(when)} ${time.format(when)}`;
}

export default defineFeature({
  id: "message-times",
  name: "Message times",
  description:
    "Shows when each message was sent, next to the sender's name, in every chat. Hover for the full date.",
  category: "chat",
  setup({ messages }) {
    messages.renderGroupTime((when) => (
      <time
        dateTime={when.toISOString()}
        title={full.format(when)}
        className="ml-2 font-normal text-muted-foreground text-xs tabular-nums"
      >
        {formatMessageTime(when)}
      </time>
    ));
  },
});
