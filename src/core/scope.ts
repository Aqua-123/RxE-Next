import { attempt } from "@/platform/log";

/**
 * Owns everything a running feature registered. Surfaces add their undo steps
 * here, so features never write teardown code; stopping the feature disposes it.
 */
export class Scope {
  #disposers: Array<() => void> = [];
  #disposed = false;

  constructor(readonly owner: string) {}

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
