import { ArrowDown01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type ReactNode, useId, useState } from "react";
import { useStore } from "zustand";
import type { Hex } from "@/themes/color";
import { FONTS, type FontId, SEED_NAMES, type SeedName, type Theme } from "@/themes/model";
import { resolveTokens } from "@/themes/resolve";
import {
  discardDraft,
  saveDraft,
  setDraftSeed,
  setDraftToken,
  themeStore,
  updateDraft,
} from "@/themes/store";
import { TOKEN_GROUPS } from "@/themes/tokens";
import { Button } from "@/ui/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/ui/components/ui/collapsible";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/ui/components/ui/field";
import { Input } from "@/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/ui/select";
import { Separator } from "@/ui/components/ui/separator";
import { Switch } from "@/ui/components/ui/switch";
import { Textarea } from "@/ui/components/ui/textarea";
import { ColorField } from "./ColorField";
import { WallpaperField } from "./WallpaperField";

/** The token each seed anchors, whose live swatch represents it. */
const SEED_TOKENS: Record<SeedName, string> = {
  background: "base1-850",
  surface: "base1-600",
  text: "primary-content",
  accent: "rxe-accent-1",
};

const SEED_LABELS: Record<SeedName, string> = {
  background: "Background",
  surface: "Panels",
  text: "Text",
  accent: "Accent",
};

const BASES = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
] as const;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header>
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}

function TokenGroup({
  group,
  draft,
  tokens,
}: {
  group: string;
  draft: Theme;
  tokens: Record<string, Hex>;
}) {
  const entries = TOKEN_GROUPS.find(([name]) => name === group)?.[1] ?? [];
  return (
    <Collapsible className="rounded-lg border border-border">
      <CollapsibleTrigger className="group/trigger flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-accent">
        {group}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          className="size-4 transition-transform group-data-panel-open/trigger:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2 border-t border-border p-3">
        {entries.map((token) => (
          <ColorField
            key={token.name}
            label={token.label}
            swatchToken={token.name}
            value={tokens[token.name]!}
            onChange={(value) => setDraftToken(token.name, value)}
            onReset={token.name in draft.tokens ? () => setDraftToken(token.name, null) : undefined}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ThemeEditor() {
  const draft = useStore(themeStore, (state) => state.draft);
  const nameId = useId();
  const baseId = useId();
  const fontId = useId();
  const glassId = useId();
  const cssId = useId();
  const [error, setError] = useState<string | null>(null);
  if (!draft) return null;
  const tokens = resolveTokens(draft);

  const save = () => {
    try {
      saveDraft();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "This theme can't be saved yet.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={discardDraft}>
          <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
          Back
        </Button>
        <p className="flex-1 text-sm text-muted-foreground">Changes preview live on the site.</p>
        <Button variant="outline" size="sm" onClick={discardDraft}>
          Discard
        </Button>
        <Button size="sm" onClick={save}>
          Save theme
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}

      <Section title="Basics">
        <Field>
          <FieldLabel htmlFor={nameId}>Name</FieldLabel>
          <Input
            id={nameId}
            value={draft.name}
            maxLength={60}
            onChange={(event) => {
              const name = event.currentTarget.value;
              updateDraft((theme) => ({ ...theme, name }));
            }}
          />
        </Field>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={baseId}>Base</FieldLabel>
            <FieldDescription>The site palette your colors start from.</FieldDescription>
          </FieldContent>
          <Select
            items={BASES}
            value={draft.base}
            onValueChange={(base) => base && updateDraft((theme) => ({ ...theme, base }))}
          >
            <SelectTrigger id={baseId} className="min-w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BASES.map((base) => (
                <SelectItem key={base.value} value={base.value}>
                  {base.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Separator />
      <Section title="Colors" description="Each color regenerates the shades derived from it.">
        <div className="flex flex-col gap-2">
          {SEED_NAMES.map((seed) => (
            <ColorField
              key={seed}
              label={SEED_LABELS[seed]}
              swatchToken={SEED_TOKENS[seed]}
              value={draft.seeds[seed] ?? tokens[SEED_TOKENS[seed]]!}
              onChange={(value) => setDraftSeed(seed, value)}
            />
          ))}
        </div>
      </Section>

      <Section title="Every token" description="Fine-tune any of the site's and RxE's colors.">
        <div className="flex flex-col gap-2">
          {TOKEN_GROUPS.map(([group]) => (
            <TokenGroup key={group} group={group} draft={draft} tokens={tokens} />
          ))}
        </div>
      </Section>

      <Separator />
      <Section title="Typography">
        <Field orientation="horizontal">
          <FieldLabel htmlFor={fontId}>Font</FieldLabel>
          <Select
            items={FONTS.map((font) => ({ value: font.id, label: font.label }))}
            value={draft.font}
            onValueChange={(font: FontId | null) =>
              font && updateDraft((theme) => ({ ...theme, font }))
            }
          >
            <SelectTrigger id={fontId} className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONTS.map((font) => (
                <SelectItem key={font.id} value={font.id}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Separator />
      <Section title="Wallpaper and effects">
        <WallpaperField
          value={draft.wallpaper}
          onChange={(wallpaper) => updateDraft((theme) => ({ ...theme, wallpaper }))}
        />
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={glassId}>Glass panels</FieldLabel>
            <FieldDescription>
              Blur what's behind translucent panels. Best with a wallpaper.
            </FieldDescription>
          </FieldContent>
          <Switch
            id={glassId}
            checked={draft.glass}
            onCheckedChange={(glass) => updateDraft((theme) => ({ ...theme, glass }))}
          />
        </Field>
      </Section>

      <Separator />
      <Section
        title="Custom CSS"
        description="Applied after everything else. Use var(--token) for colors."
      >
        <Textarea
          id={cssId}
          aria-label="Custom CSS"
          value={draft.customCss}
          spellCheck={false}
          rows={6}
          className="font-mono text-xs"
          onChange={(event) => {
            const customCss = event.currentTarget.value;
            updateDraft((theme) => ({ ...theme, customCss }));
          }}
        />
      </Section>
    </div>
  );
}
