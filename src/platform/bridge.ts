import type { SiteContexts } from "../types/site";

type ContextName = keyof SiteContexts;

/**
 * Context values are recognised by their property names, which survive minification
 * and are stable across the site's redeploys. Each shape must be unique in the tree.
 */
const SHAPES: { [K in ContextName]: readonly string[] } = {
  auth: ["user", "isLoading", "setBan"],
  prefs: ["muted_users", "add_muted_user", "remove_muted_user"],
  cable: ["cable", "subscriptions"],
  popups: ["openPopup", "closePopup", "closeAllPopups"],
  groupChat: ["messages", "onlineUsers", "addMessage"],
  router: ["pathname", "asPath", "push", "events"],
};

const MAX_DEPTH = 80;

interface Fiber {
  type: unknown;
  memoizedProps: unknown;
  child: Fiber | null;
  sibling: Fiber | null;
  stateNode: unknown;
}

/** The committed tree. Fibers reached through DOM nodes may be stale alternates. */
function currentRoot(): Fiber | undefined {
  const container = document.getElementById("__next");
  if (!container) return undefined;
  const key = Object.keys(container).find((name) => name.startsWith("__reactContainer$"));
  if (!key) return undefined;
  const hostRoot = (container as unknown as Record<string, Fiber>)[key];
  return (hostRoot?.stateNode as { current?: Fiber } | undefined)?.current;
}

function providedValue(fiber: Fiber): unknown {
  const type = fiber.type as { _context?: unknown } | null;
  if (typeof type !== "object" || !type?._context) return undefined;
  return (fiber.memoizedProps as { value?: unknown } | null)?.value;
}

function hasShape(value: unknown, keys: readonly string[]): boolean {
  return typeof value === "object" && value !== null && keys.every((key) => key in value);
}

/** Walks the committed tree once and returns whichever of the requested contexts are mounted. */
export function findContexts<K extends ContextName>(
  names: readonly K[]
): Partial<Pick<SiteContexts, K>> {
  const found: Partial<Record<ContextName, unknown>> = {};
  const root = currentRoot();
  if (!root) return {};

  let remaining = names.length;
  const stack: Array<[Fiber, number]> = [[root, 0]];
  while (stack.length > 0 && remaining > 0) {
    const [fiber, depth] = stack.pop()!;
    const value = providedValue(fiber);
    if (value !== undefined) {
      for (const name of names) {
        if (!(name in found) && hasShape(value, SHAPES[name])) {
          found[name] = value;
          remaining -= 1;
        }
      }
    }
    if (fiber.sibling) stack.push([fiber.sibling, depth]);
    if (fiber.child && depth < MAX_DEPTH) stack.push([fiber.child, depth + 1]);
  }
  return found as Partial<Pick<SiteContexts, K>>;
}

/** Reads the current value of one site context. Never cache the result: values change every render. */
export function siteContext<K extends ContextName>(name: K): SiteContexts[K] | undefined {
  return findContexts([name])[name];
}
