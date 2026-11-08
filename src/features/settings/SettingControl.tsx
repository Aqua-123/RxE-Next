import { useId } from "react";
import { useStore } from "zustand";
import { readSettings, type SettingDefinition, settingsStore, writeSetting } from "@/core/settings";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/ui/select";
import { Slider } from "@/ui/components/ui/slider";
import { Switch } from "@/ui/components/ui/switch";
import { Textarea } from "@/ui/components/ui/textarea";

interface SettingControlProps {
  featureId: string;
  settingKey: string;
  definition: SettingDefinition;
}

/** One control per setting kind, generated from a feature's schema. */
export function SettingControl({ featureId, settingKey, definition }: SettingControlProps) {
  const id = useId();
  const value = useStore(
    settingsStore,
    () => readSettings(featureId, { [settingKey]: definition })[settingKey]
  );
  const set = (next: unknown) => writeSetting(featureId, settingKey, next);
  const description = definition.description ? (
    <FieldDescription>{definition.description}</FieldDescription>
  ) : null;

  switch (definition.kind) {
    case "boolean":
      return (
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={id}>{definition.label}</FieldLabel>
            {description}
          </FieldContent>
          <Switch id={id} checked={value as boolean} onCheckedChange={set} />
        </Field>
      );
    case "select":
      return (
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={id}>{definition.label}</FieldLabel>
            {description}
          </FieldContent>
          <Select
            items={definition.options}
            value={value as string}
            onValueChange={(next) => next !== null && set(next)}
          >
            <SelectTrigger id={id} className="min-w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {definition.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );
    case "number":
      return (
        <Field>
          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor={id}>{definition.label}</FieldLabel>
            <span className="text-sm text-muted-foreground tabular-nums">
              {value as number}
              {definition.unit}
            </span>
          </div>
          {description}
          <Slider
            id={id}
            min={definition.min}
            max={definition.max}
            step={definition.step}
            value={[value as number]}
            onValueChange={(next) => set(Array.isArray(next) ? next[0] : next)}
          />
        </Field>
      );
    case "text":
      return (
        <Field>
          <FieldLabel htmlFor={id}>{definition.label}</FieldLabel>
          {description}
          {definition.multiline ? (
            <Textarea
              id={id}
              value={value as string}
              placeholder={definition.placeholder}
              onChange={(event) => set(event.currentTarget.value)}
            />
          ) : (
            <Input
              id={id}
              value={value as string}
              placeholder={definition.placeholder}
              onChange={(event) => set(event.currentTarget.value)}
            />
          )}
        </Field>
      );
  }
}
