import type { ReactNode } from "react";
import type { Scope } from "@/core/scope";
import { watch } from "@/platform/dom";
import { attempt } from "@/platform/log";
import { mount } from "@/ui/mount";
import type { Comment, Paged, Post, Profile, UserId, WallId } from "../model";
import { parseComments, parseProfile, parseWall } from "../wire";

const API_BASE = "https://api.emeraldchat.com/api/v1";

/** The site's profile card, shown when you click a user. The hash suffix changes between builds. */
const PROFILE_CARD = '[class*="user-settings_userProfileContainer__"]';

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  // The wall endpoint answers 422 for a user with no posts; callers treat that as empty.
  if (response.status === 422) return { status: 422 };
  if (!response.ok) throw new Error(`${path} → ${response.status}`);
  return response.json();
}

const EMPTY_PAGE = { items: [], nextPage: null } as const;

export interface ProfilesApi {
  /** A user's profile, including the `wallId` needed to read their posts. */
  fetchProfile(id: UserId): Promise<Profile | null>;
  /** One page of a user's wall. Empty for users with no posts or anonymized walls. */
  fetchWall(wallId: WallId, page: number): Promise<Paged<Post>>;
  /** One page of comments on a wall post. */
  fetchComments(wallId: WallId, postId: number, page: number): Promise<Paged<Comment>>;
  /**
   * Adds an action into the site's profile card each time it opens, bound to the
   * user that card is showing.
   */
  addCardAction(render: (props: { userId: UserId }) => ReactNode): void;
}

/** The id of the user whose card is opening, read from the element that was clicked to open it. */
let lastClickedUserId: UserId | null = null;

function userIdFrom(element: Element | null): UserId | null {
  const row = element?.closest<HTMLElement>("[data-user-id]");
  const attr = row?.dataset.userId;
  if (attr && /^\d+$/.test(attr)) return Number(attr) as UserId;
  const member = element?.closest(".matchItem");
  return member ? fiberUserId(member) : null;
}

/** Walks the React fiber behind a DOM node for the user object it carries. */
function fiberUserId(element: Element): UserId | null {
  const key = Object.keys(element).find((name) => name.startsWith("__reactFiber$"));
  if (!key) return null;
  const seen = new WeakSet<object>();
  let best: { id: UserId; score: number } | null = null;

  const consider = (value: unknown, depth: number): void => {
    if (!value || typeof value !== "object" || depth > 6 || seen.has(value)) return;
    seen.add(value);
    const record = value as Record<string, unknown>;
    if (typeof record.id === "number" && typeof record.username === "string") {
      // Prefer the object that carries profile fields; it's the user the card is about.
      const score = ["wall_id", "bio", "location"].filter((field) => field in record).length;
      if (!best || score > best.score) best = { id: record.id as UserId, score };
    }
    for (const nested of Object.values(record)) consider(nested, depth + 1);
  };

  let fiber = (element as unknown as Record<string, { memoizedProps?: unknown } | null>)[key];
  for (let i = 0; fiber && i < 12; i += 1) {
    consider(fiber.memoizedProps, 0);
    fiber = (fiber as { return?: { memoizedProps?: unknown } | null }).return ?? null;
  }
  return best ? (best as { id: UserId }).id : null;
}

let clickListening = false;

function startClickTracking(): void {
  if (clickListening) return;
  clickListening = true;
  document.addEventListener(
    "click",
    (event) => {
      const id = attempt("profile click", () => userIdFrom(event.target as Element | null));
      if (id != null) lastClickedUserId = id;
    },
    { capture: true }
  );
}

export function scopedProfiles(scope: Scope): ProfilesApi {
  return {
    async fetchProfile(id) {
      return parseProfile(await getJson(`/user/profile?id=${id}`));
    },
    async fetchWall(wallId, page) {
      const data = await getJson(`/user/posts/v2?wall_id=${wallId}&page=${page}`);
      return (data as { status?: number }).status === 422 ? EMPTY_PAGE : parseWall(data);
    },
    async fetchComments(wallId, postId, page) {
      const data = await getJson(
        `/user/posts/commentsv2?wall_id=${wallId}&post_id=${postId}&page=${page}`
      );
      return (data as { status?: number }).status === 422 ? EMPTY_PAGE : parseComments(data);
    },
    addCardAction(render) {
      startClickTracking();
      const stop = watch(PROFILE_CARD, (card) => {
        const userId = lastClickedUserId ?? fiberUserId(card);
        if (userId == null) return;
        return mount(render({ userId }), card, "prepend");
      });
      scope.add(stop);
    },
  };
}
