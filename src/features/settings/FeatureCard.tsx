import { useId } from "react";
import { type FeatureState, type FeatureStatus, setFeatureEnabled } from "@/core/runtime";
import { Separator } from "@/ui/components/ui/separator";
import { Switch } from "@/ui/components/ui/switch";
import { cn } from "@/ui/lib/utils";
import { SettingControl } from "./SettingControl";

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

export function FeatureCard({ status }: { status: FeatureStatus }) {
  const nameId = useId();
  const descriptionId = useId();
  const settings = Object.entries(status.settings);

  return (
    <section
      aria-labelledby={nameId}
      className="rounded-xl border border-border bg-card text-card-foreground transition-colors hover:border-input"
    >
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1.5 p-4">
        <h3 id={nameId} className="font-semibold leading-snug">
          {status.name}
        </h3>
        <Switch
          checked={status.enabled}
          onCheckedChange={(enabled) => setFeatureEnabled(status.id, enabled)}
          aria-labelledby={nameId}
          aria-describedby={descriptionId}
        />
        <p
          id={descriptionId}
          className="col-span-full text-sm leading-relaxed text-muted-foreground"
        >
          {status.description}
        </p>
        <span
          className={cn(
            "col-span-full flex items-center gap-1.5 text-xs text-muted-foreground before:size-1.5 before:rounded-full before:bg-current",
            status.state.kind === "running" && "text-success",
            status.state.kind === "error" && "text-destructive"
          )}
        >
          {describe(status.state)}
        </span>
      </div>
      {status.enabled && settings.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-5 p-4">
            {settings.map(([key, definition]) => (
              <SettingControl
                key={key}
                featureId={status.id}
                settingKey={key}
                definition={definition}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
