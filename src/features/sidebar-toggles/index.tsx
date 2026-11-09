import {
  LeftToRightListBulletIcon,
  Message01Icon,
  UserMultiple02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { defineFeature } from "@/core/feature";
import type { SidebarToggle } from "@/site/surfaces/sidebars";
import { cn } from "@/ui/lib/utils";

function iconFor({ label, side }: SidebarToggle): IconSvgElement {
  if (side === "right") return UserMultiple02Icon;
  return /message/i.test(label) ? Message01Icon : LeftToRightListBulletIcon;
}

function ToggleChip(toggle: SidebarToggle) {
  const { label, side, open, count } = toggle;
  return (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center gap-2 rounded-lg px-3 font-medium text-sm transition-colors",
        open
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-accent"
      )}
    >
      <HugeiconsIcon icon={iconFor(toggle)} className="size-4 shrink-0" />
      <span className="truncate">{side === "right" ? "Online" : label}</span>
      {count !== null && count > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 text-xs tabular-nums",
            open ? "bg-primary-foreground/20" : "bg-background/50 text-secondary-foreground"
          )}
        >
          {count}
        </span>
      )}
    </span>
  );
}

export default defineFeature({
  id: "sidebar-toggles",
  name: "Side panel buttons",
  description:
    "On small screens, turns the plain “Channels >” and “< Online Users” links into a button bar, with how many people are online.",
  category: "appearance",
  setup({ ui }) {
    ui.sidebars.renderToggle((toggle) => <ToggleChip {...toggle} />);
  },
});
