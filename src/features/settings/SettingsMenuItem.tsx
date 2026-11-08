import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/** Sits in the site's account dropdown; matches its items (`.menuItem > button`) and adds the RxE shimmer. */
export function SettingsMenuItem({ onSelect }: { onSelect(): void }) {
  return (
    <div
      role="menuitem"
      className="cursor-pointer transition-colors duration-300 hover:bg-[var(--base1-700,#444755)]"
    >
      <button
        type="button"
        onClick={onSelect}
        className="group flex w-full cursor-pointer items-center gap-2 p-2.5 text-start text-base leading-[normal] font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <HugeiconsIcon icon={SparklesIcon} size={16} strokeWidth={2} className="shrink-0 animate-sparkle motion-reduce:animate-none" />
        <span className="text-shimmer transition-[filter] duration-150 group-hover:drop-shadow-[0_0_6px_rgb(196_160_255/0.55)]">
          RxE Settings
        </span>
      </button>
    </div>
  );
}
