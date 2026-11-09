import { Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/** Sits in the site's navigation drawer, next to Dashboard, Meet, Friends, Messages and Search. */
export function SettingsNavItem({ onSelect }: { onSelect(): void }) {
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onSelect}
        className="group flex w-full cursor-pointer items-center gap-2.5 py-2 text-start text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <HugeiconsIcon icon={Settings01Icon} className="size-4" />
        <span className="text-shimmer">RxE Settings</span>
      </button>
    </li>
  );
}
