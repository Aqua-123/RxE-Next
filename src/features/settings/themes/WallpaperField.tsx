import { Image01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId, useRef, useState } from "react";
import type { Wallpaper } from "@/themes/model";
import { saveWallpaper } from "@/themes/wallpapers";
import { Button } from "@/ui/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/ui/select";
import { Slider } from "@/ui/components/ui/slider";

type Kind = "none" | "url" | "upload";

const KINDS: readonly { value: Kind; label: string }[] = [
  { value: "none", label: "None" },
  { value: "url", label: "Image URL" },
  { value: "upload", label: "Upload" },
];

const DEFAULTS = { blur: 0, dim: 0.25, surfaceOpacity: 0.85 };

interface WallpaperFieldProps {
  value: Wallpaper | null;
  onChange(value: Wallpaper | null): void;
}

function PercentSlider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  onChange(value: number): void;
}) {
  const id = useId();
  const format = props.format ?? ((value: number) => `${Math.round(value * 100)}%`);
  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={id}>{props.label}</FieldLabel>
        <span className="text-sm text-muted-foreground tabular-nums">{format(props.value)}</span>
      </div>
      <Slider
        id={id}
        min={props.min}
        max={props.max}
        step={props.step}
        value={[props.value]}
        onValueChange={(next) => props.onChange(Array.isArray(next) ? next[0]! : next)}
      />
    </Field>
  );
}

export function WallpaperField({ value, onChange }: WallpaperFieldProps) {
  const kindId = useId();
  const urlId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Kind>(value?.source.kind ?? "none");
  const [url, setUrl] = useState(value?.source.kind === "url" ? value.source.url : "");
  const [error, setError] = useState<string | null>(null);
  const tuning = value ?? DEFAULTS;

  const applyUrl = (next: string) => {
    setUrl(next);
    try {
      const parsed = new URL(next);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
      setError(null);
      onChange({ ...tuning, source: { kind: "url", url: parsed.href } });
    } catch {
      setError(next ? "Enter a full http(s) image URL." : null);
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const id = await saveWallpaper(file);
      setError(null);
      onChange({ ...tuning, source: { kind: "upload", id } });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Field orientation="horizontal">
        <FieldLabel htmlFor={kindId}>Wallpaper</FieldLabel>
        <Select
          items={KINDS}
          value={kind}
          onValueChange={(next) => {
            if (!next) return;
            setKind(next);
            if (next === "none") onChange(null);
          }}
        >
          <SelectTrigger id={kindId} className="min-w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {kind === "url" && (
        <Field>
          <FieldLabel htmlFor={urlId}>Image URL</FieldLabel>
          <Input
            id={urlId}
            value={url}
            placeholder="https://…"
            onChange={(event) => applyUrl(event.currentTarget.value)}
          />
        </Field>
      )}

      {kind === "upload" && (
        <Field>
          <FieldDescription>
            PNG, JPEG, WebP or GIF up to 8 MB. Stored only in this browser.
          </FieldDescription>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => void upload(event.currentTarget.files?.[0])}
          />
          <Button variant="outline" className="w-fit" onClick={() => fileInput.current?.click()}>
            <HugeiconsIcon icon={Image01Icon} data-icon="inline-start" />
            {value?.source.kind === "upload" ? "Replace image" : "Choose image"}
          </Button>
        </Field>
      )}

      {error && <FieldError>{error}</FieldError>}

      {value && (
        <>
          <PercentSlider
            label="Blur"
            value={value.blur}
            min={0}
            max={40}
            step={1}
            format={(blur) => `${blur}px`}
            onChange={(blur) => onChange({ ...value, blur })}
          />
          <PercentSlider
            label="Dim"
            value={value.dim}
            min={0}
            max={0.9}
            step={0.05}
            onChange={(dim) => onChange({ ...value, dim })}
          />
          <PercentSlider
            label="Panel opacity"
            value={value.surfaceOpacity}
            min={0.2}
            max={1}
            step={0.05}
            onChange={(surfaceOpacity) => onChange({ ...value, surfaceOpacity })}
          />
        </>
      )}
    </div>
  );
}
