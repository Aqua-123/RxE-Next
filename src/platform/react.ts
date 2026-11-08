/**
 * Reads React context values from the site's committed tree. Values are found by
 * the property names they carry, which survive minification and redeploys.
 */

const MAX_DEPTH = 80;

interface Fiber {
  type: unknown;
  memoizedProps: unknown;
  child: Fiber | null;
  sibling: Fiber | null;
  stateNode: unknown;
}

/** The committed tree. Fibers reached through DOM nodes may be stale alternates. */
function currentRoot(containerId: string): Fiber | undefined {
  const container = document.getElementById(containerId);
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

/** Walks the tree once and returns the provided value matching each requested shape. */
export function findContextValues<K extends string>(
  containerId: string,
  shapes: Readonly<Record<K, readonly string[]>>,
  names: readonly K[]
): Partial<Record<K, unknown>> {
  const found: Partial<Record<K, unknown>> = {};
  const root = currentRoot(containerId);
  if (!root) return found;

  let remaining = names.length;
  const stack: Array<[Fiber, number]> = [[root, 0]];
  while (stack.length > 0 && remaining > 0) {
    const [fiber, depth] = stack.pop()!;
    const value = providedValue(fiber);
    if (value !== undefined) {
      for (const name of names) {
        if (!(name in found) && hasShape(value, shapes[name])) {
          found[name] = value;
          remaining -= 1;
        }
      }
    }
    if (fiber.sibling) stack.push([fiber.sibling, depth]);
    if (fiber.child && depth < MAX_DEPTH) stack.push([fiber.child, depth + 1]);
  }
  return found;
}
