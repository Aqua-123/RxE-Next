import type { Scope } from "@/core/scope";
import { injectStyle } from "@/platform/dom";
import type { UserId } from "../model";

/** One rendered chat message row in group chat. */
const MESSAGE_ROW = '[class*="room_global_textContainer__"]';

export interface MessagesApi {
  /** Hides already-rendered messages by these authors. Replaces this feature's previous set. */
  hideAuthors(ids: Iterable<UserId>): void;
}

const hiddenByScope = new Map<Scope, ReadonlySet<UserId>>();

function render(): void {
  const ids = new Set([...hiddenByScope.values()].flatMap((set) => [...set]));
  const selectors = [...ids].map((id) => `${MESSAGE_ROW}[data-user-id="${id}"]`);
  injectStyle("messages-hidden", selectors.length ? `${selectors.join(",")}{display:none!important}` : "");
}

export function scopedMessages(scope: Scope): MessagesApi {
  scope.add(() => {
    if (hiddenByScope.delete(scope)) render();
  });
  return {
    hideAuthors(ids) {
      hiddenByScope.set(scope, new Set(ids));
      render();
    },
  };
}
