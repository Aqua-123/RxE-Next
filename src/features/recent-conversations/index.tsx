import { useEffect, useState } from "react";
import { defineFeature } from "@/core/feature";
import type { Conversation } from "@/site/model";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { cn } from "@/ui/lib/utils";

const SHOWN = 6;

type Load =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; list: Conversation[] };

function Avatar({ conversation }: { conversation: Conversation }) {
  const { user } = conversation;
  return (
    <span className="relative size-10 shrink-0">
      {user.avatar ? (
        <img src={user.avatar} alt="" className="size-10 rounded-full bg-muted object-cover" />
      ) : (
        <span className="flex size-10 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {user.online && (
        <span
          title="Online"
          className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-card bg-success"
        />
      )}
    </span>
  );
}

function RecentConversations({ load }: { load(): Promise<Conversation[]> }) {
  const [state, setState] = useState<Load>({ kind: "loading" });
  useEffect(() => {
    load().then(
      (list) => setState({ kind: "ready", list }),
      (error: unknown) =>
        setState({ kind: "error", message: String(error instanceof Error ? error.message : error) })
    );
  }, [load]);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Recent conversations</CardTitle>
      </CardHeader>
      <CardContent>
        {state.kind === "loading" && <p className="text-muted-foreground text-sm">Loading…</p>}
        {state.kind === "error" && <p className="text-destructive text-sm">{state.message}</p>}
        {state.kind === "ready" && state.list.length === 0 && (
          <p className="text-muted-foreground text-sm">No conversations yet.</p>
        )}
        {state.kind === "ready" && state.list.length > 0 && (
          <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {state.list.slice(0, SHOWN).map((conversation) => (
              <li key={conversation.user.id}>
                <a
                  href={`/app/messages/?id=${conversation.user.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <Avatar conversation={conversation} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-sm">
                      {conversation.user.name}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-xs",
                        conversation.unread
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {conversation.fromMe && "You: "}
                      {conversation.preview ?? "Image"}
                    </span>
                  </span>
                  {conversation.unread && (
                    <span className="size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default defineFeature({
  id: "recent-conversations",
  name: "Recent conversations on the dashboard",
  description:
    "Adds your latest DMs, with who's online and what's unread, under the dashboard's cards.",
  category: "appearance",
  setup({ site, ui }) {
    ui.chrome.addDashboardSection(() => <RecentConversations load={site.recentConversations} />);
  },
});
