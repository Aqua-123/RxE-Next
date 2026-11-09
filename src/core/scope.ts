import { attempt } from "@/platform/log";

/**
 * Owns everything a running feature registered. Surfaces add their undo steps
 * here, so features never write teardown code; stopping the feature disposes it.
 */
export class Scope {
  #disposers: Array<() => void> = [];
  #disposed = false;

  /** `order` is the feature's position in FEATURES; surfaces run handlers in that order. */
  constructor(
    readonly owner: string,
    readonly order = 0
  ) {}

  add(disposer: () => void): void {
    if (this.#disposed) {
      attempt(`${this.owner} late disposer`, disposer);
      return;
    }
    this.#disposers.push(disposer);
  }

  dispose(): void {
    this.#disposed = true;
    for (const disposer of this.#disposers.splice(0).reverse()) {
      attempt(`${this.owner} disposer`, disposer);
    }
  }
}

/**
 * Handlers from several features, iterated in feature order, so the result never
 * depends on which feature was toggled on last.
 */
export class Pipeline<T> implements Iterable<T> {
  #entries: Array<{ order: number; value: T }> = [];

  /** Returns the function that removes the handler again. */
  add(scope: Scope, value: T): () => void {
    const entry = { order: scope.order, value };
    const index = this.#entries.findIndex((other) => other.order > entry.order);
    this.#entries.splice(index < 0 ? this.#entries.length : index, 0, entry);
    return () => {
      this.#entries = this.#entries.filter((other) => other !== entry);
    };
  }

  get size(): number {
    return this.#entries.length;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (const { value } of this.#entries) yield value;
  }
}
