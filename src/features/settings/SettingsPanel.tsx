import { useStore } from "zustand";
import { META } from "@/meta";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";
import { Switch } from "@/ui/components/ui/switch";
import { cn } from "@/ui/lib/utils";
import { featureStatuses, setFeatureEnabled, type FeatureState, type FeatureStatus } from "@/core/runtime";
import { setSettingsOpen, settingsPanel } from "./state";

function describe(state: FeatureState): string {
  switch (state.kind) {
    case "running":
      return "Running";
    case "off":
      return "Off";
    case "inactive":
      return "Not active on this page";
    case "reload-required":
      return "Reload the page to apply";
    case "error":
      return `Error: ${state.message}`;
  }
}

function FeatureRow({ status }: { status: FeatureStatus }) {
  const nameId = `rxe-feature-${status.id}`;
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg border border-transparent bg-card p-4 transition-colors hover:border-border">
      <span id={nameId} className="font-semibold">
        {status.name}
      </span>
      <Switch
        checked={status.enabled}
        onCheckedChange={(enabled) => setFeatureEnabled(status.id, enabled)}
        aria-labelledby={nameId}
        aria-describedby={`${nameId}-description`}
      />
      <p id={`${nameId}-description`} className="col-span-full text-sm leading-relaxed text-muted-foreground">
        {status.description}
      </p>
      <span
        data-state={status.state.kind}
        className={cn(
          "col-span-full flex items-center gap-1.5 text-xs text-muted-foreground before:size-1.5 before:rounded-full before:bg-current",
          status.state.kind === "running" && "text-success",
          status.state.kind === "error" && "text-destructive"
        )}
      >
        {describe(status.state)}
      </span>
    </li>
  );
}

export function SettingsPanel() {
  const open = useStore(settingsPanel, (state) => state.open);
  const statuses = useStore(featureStatuses);
  return (
    <Dialog open={open} onOpenChange={setSettingsOpen}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div aria-hidden className="h-0.5 bg-linear-to-r from-rxe-lavender via-rxe-pink to-rxe-peach" />
        <DialogHeader className="px-5 pt-4 pb-3">
          <DialogTitle className="flex items-baseline gap-2 text-lg font-bold">
            <span>
              <span className="text-shimmer">RxE</span> Settings
            </span>
            <span className="text-xs font-medium text-muted-foreground">v{META.version}</span>
          </DialogTitle>
          <DialogDescription>Features RxE adds to EmeraldChat.</DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-[min(560px,70vh)] flex-col gap-2 overflow-y-auto px-5 pb-5">
          {statuses
            .filter((status) => !status.core)
            .map((status) => (
              <FeatureRow key={status.id} status={status} />
            ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
