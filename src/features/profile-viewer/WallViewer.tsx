import {
  Calendar03Icon,
  CheckmarkBadge01Icon,
  Comment01Icon,
  FavouriteIcon,
  Loading03Icon,
  Location01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import type { Comment, Paged, Post, Profile, UserId, WallId } from "@/site/model";
import type { ProfilesApi } from "@/site/surfaces/profiles";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/ui/components/ui/dialog";
import { Empty, EmptyDescription, EmptyTitle } from "@/ui/components/ui/empty";
import { ScrollArea } from "@/ui/components/ui/scroll-area";
import { Separator } from "@/ui/components/ui/separator";
import { closeWall, wallViewer } from "./state";

function timeAgo(date: Date | null): string {
  if (!date) return "";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(-Math.round(seconds / size), unit);
  }
  return format.format(-seconds, "second");
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10 text-muted-foreground">
      <HugeiconsIcon icon={Loading03Icon} className="animate-spin" />
    </div>
  );
}

function Avatar({ src, className }: { src: string | null; className: string }) {
  return src ? (
    <img src={src} alt="" className={`${className} rounded-full object-cover`} />
  ) : (
    <div className={`${className} rounded-full bg-muted`} />
  );
}

function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <div className="flex gap-4">
      <div className="relative shrink-0">
        <Avatar src={profile.avatar} className="size-16" />
        {profile.online && (
          <span className="absolute right-0 bottom-0 size-4 rounded-full bg-success ring-2 ring-popover" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-lg font-semibold">{profile.name}</span>
          {profile.verified && (
            <HugeiconsIcon icon={CheckmarkBadge01Icon} className="shrink-0 text-primary" />
          )}
        </div>
        <span className="truncate text-sm text-muted-foreground">#{profile.username}</span>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{profile.karma.toLocaleString()} karma</Badge>
          {profile.location && (
            <Badge variant="outline" className="gap-1">
              <HugeiconsIcon icon={Location01Icon} className="size-3" />
              {profile.location}
            </Badge>
          )}
          {profile.createdAt && (
            <Badge variant="outline" className="gap-1">
              <HugeiconsIcon icon={Calendar03Icon} className="size-3" />
              Joined {timeAgo(profile.createdAt)}
            </Badge>
          )}
          {!profile.online && profile.lastSeen && (
            <Badge variant="outline">Last seen {timeAgo(profile.lastSeen)}</Badge>
          )}
        </div>
        {profile.bio && <p className="mt-1 text-sm whitespace-pre-wrap">{profile.bio}</p>}
      </div>
    </div>
  );
}

function Comments({
  profiles,
  wallId,
  post,
}: {
  profiles: ProfilesApi;
  wallId: WallId;
  post: Post;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<Paged<Comment> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = (next: number, previous: readonly Comment[]) => {
    setLoading(true);
    profiles
      .fetchComments(wallId, post.id, next)
      .then((result) =>
        setPage({ items: [...previous, ...result.items], nextPage: result.nextPage })
      )
      .catch(() => setPage({ items: [...previous], nextPage: null }))
      .finally(() => setLoading(false));
  };

  if (post.comments === 0) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        className="text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !page) load(1, []);
        }}
      >
        {open ? "Hide" : "View"} {post.comments} {post.comments === 1 ? "comment" : "comments"}
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-2 border-l-2 border-border pl-3">
          {page?.items.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar src={comment.author.avatar} className="mt-0.5 size-6 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-semibold">{comment.author.name}</span>
                <span className="ml-1.5 text-[11px] text-muted-foreground">
                  {timeAgo(comment.createdAt)}
                </span>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))}
          {loading && <Spinner />}
          {page?.nextPage != null && !loading && (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => load(page.nextPage!, page.items)}
            >
              More comments
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({
  profiles,
  wallId,
  post,
}: {
  profiles: ProfilesApi;
  wallId: WallId;
  post: Post;
}) {
  return (
    <article className="rounded-lg bg-muted/40 p-3">
      <div className="flex items-center gap-2">
        <Avatar src={post.author.avatar} className="size-7 shrink-0" />
        <span className="text-sm font-semibold">{post.author.name}</span>
        <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <HugeiconsIcon icon={FavouriteIcon} className="size-3.5" />
          {post.likes}
        </span>
        <span className="flex items-center gap-1">
          <HugeiconsIcon icon={Comment01Icon} className="size-3.5" />
          {post.comments}
        </span>
      </div>
      <Comments profiles={profiles} wallId={wallId} post={post} />
    </article>
  );
}

interface WallState {
  status: "loading" | "ready" | "error";
  profile: Profile | null;
  posts: readonly Post[];
  nextPage: number | null;
}

function Wall({ profiles, userId }: { profiles: ProfilesApi; userId: UserId }) {
  const [state, setState] = useState<WallState>({
    status: "loading",
    profile: null,
    posts: [],
    nextPage: null,
  });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let active = true;
    setState({ status: "loading", profile: null, posts: [], nextPage: null });
    (async () => {
      const profile = await profiles.fetchProfile(userId);
      if (!active) return;
      if (!profile) {
        setState({ status: "error", profile: null, posts: [], nextPage: null });
        return;
      }
      if (profile.wallId == null) {
        setState({ status: "ready", profile, posts: [], nextPage: null });
        return;
      }
      const wall = await profiles.fetchWall(profile.wallId, 1);
      if (!active) return;
      setState({ status: "ready", profile, posts: wall.items, nextPage: wall.nextPage });
    })().catch(() => {
      if (active) setState({ status: "error", profile: null, posts: [], nextPage: null });
    });
    return () => {
      active = false;
    };
  }, [profiles, userId]);

  const loadMore = () => {
    const wallId = state.profile?.wallId;
    if (wallId == null || state.nextPage == null) return;
    setLoadingMore(true);
    profiles
      .fetchWall(wallId, state.nextPage)
      .then((wall) =>
        setState((prev) => ({
          ...prev,
          posts: [...prev.posts, ...wall.items],
          nextPage: wall.nextPage,
        }))
      )
      .finally(() => setLoadingMore(false));
  };

  if (state.status === "loading") return <Spinner />;
  if (state.status === "error" || !state.profile) {
    return (
      <Empty>
        <EmptyTitle>Couldn't load this profile</EmptyTitle>
        <EmptyDescription>The user may be offline or the request was blocked.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <ProfileHeader profile={state.profile} />
      <Separator />
      {state.profile.wallId == null ? (
        <Empty>
          <EmptyTitle>Wall unavailable</EmptyTitle>
          <EmptyDescription>
            The server didn't return this user's wall. That happens for anonymous users, and
            currently for everyone while EmeraldChat's API intermittently omits wall ids.
          </EmptyDescription>
        </Empty>
      ) : state.posts.length === 0 ? (
        <Empty>
          <EmptyTitle>No posts yet</EmptyTitle>
          <EmptyDescription>This user hasn't posted anything to their wall.</EmptyDescription>
        </Empty>
      ) : (
        <ScrollArea className="-mx-1 min-h-0 flex-1">
          <div className="flex flex-col gap-3 px-1">
            {state.posts.map((post) => (
              <PostCard
                key={post.id}
                profiles={profiles}
                wallId={state.profile!.wallId!}
                post={post}
              />
            ))}
            {state.nextPage != null && (
              <Button
                variant="outline"
                className="self-center"
                disabled={loadingMore}
                onClick={loadMore}
              >
                {loadingMore ? "Loading…" : "Load more posts"}
              </Button>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export function WallViewer({ profiles }: { profiles: ProfilesApi }) {
  const userId = useStore(wallViewer, (state) => state.userId);
  return (
    <Dialog open={userId != null} onOpenChange={(open) => !open && closeWall()}>
      <DialogContent className="flex h-[min(680px,86vh)] flex-col gap-4 sm:max-w-lg">
        <div className="sr-only">
          <DialogTitle>User wall</DialogTitle>
          <DialogDescription>A user's profile and their wall posts.</DialogDescription>
        </div>
        {userId != null && <Wall profiles={profiles} userId={userId} />}
      </DialogContent>
    </Dialog>
  );
}
