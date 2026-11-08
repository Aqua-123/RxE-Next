import {
  Add01Icon,
  Delete02Icon,
  Download04Icon,
  PencilEdit02Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { isBuiltin } from "@/themes/builtin";
import type { Theme } from "@/themes/model";
import {
  activateTheme,
  allThemes,
  deleteTheme,
  editTheme,
  exportTheme,
  importTheme,
  newThemeFrom,
  themeStore,
} from "@/themes/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/ui/components/ui/alert-dialog";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { FieldError } from "@/ui/components/ui/field";
import { downloadText, safeFileName } from "@/ui/files";
import { cn } from "@/ui/lib/utils";
import { installSwatchStyles, setPreviewStyles } from "./previewStyles";
import { ThemeEditor } from "./ThemeEditor";

/** A miniature chat in the theme's own colors. */
function ThemeMock({ theme }: { theme: Theme }) {
  return (
    <div
      data-theme-preview={theme.id}
      aria-hidden
      className="flex h-24 flex-col gap-1.5 overflow-hidden rounded-lg bg-preview-background p-2"
    >
      <div className="h-1 rounded-full bg-linear-to-r from-preview-accent-1 via-preview-accent-2 to-preview-accent-3" />
      <div className="flex items-center gap-1.5">
        <span className="size-4 rounded-full bg-preview-accent-1" />
        <span className="h-2 w-16 rounded-full bg-preview-text" />
      </div>
      <div className="ml-5 h-2 w-24 rounded-full bg-preview-muted" />
      <div className="mt-auto h-5 rounded-md bg-preview-surface" />
    </div>
  );
}

function ThemeCard({ theme, active }: { theme: Theme; active: boolean }) {
  const builtin = isBuiltin(theme.id);
  const download = async () =>
    downloadText(`${safeFileName(theme.name)}.rxe-theme.json`, await exportTheme(theme.id));

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-3 transition-colors",
        active ? "border-primary" : "border-border hover:border-input"
      )}
    >
      <ThemeMock theme={theme} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{theme.name}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {theme.author ?? (builtin ? "Built in" : "Custom")} ·{" "}
            {theme.base === "dark" ? "Dark" : "Light"}
          </p>
        </div>
        {active && <Badge>Active</Badge>}
      </div>
      <div className="flex items-center gap-1">
        {!active && (
          <Button size="sm" className="mr-auto" onClick={() => activateTheme(theme.id)}>
            Use
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(active && "ml-auto")}
          aria-label={builtin ? `Customize ${theme.name}` : `Edit ${theme.name}`}
          onClick={() => editTheme(theme.id)}
        >
          <HugeiconsIcon icon={PencilEdit02Icon} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Export ${theme.name}`}
          onClick={() => void download()}
        >
          <HugeiconsIcon icon={Download04Icon} />
        </Button>
        {!builtin && (
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label={`Delete ${theme.name}`} />}
            >
              <HugeiconsIcon icon={Delete02Icon} />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{theme.name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  This can't be undone. Export it first to keep a copy.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => void deleteTheme(theme.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </article>
  );
}

function ThemeGallery() {
  const state = useStore(themeStore);
  const themes = allThemes(state);
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPreviewStyles(themes), [themes]);

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const theme = await importTheme(await file.text());
      setError(null);
      activateTheme(theme.id);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-sm text-muted-foreground">
          Themes recolor the whole site, and RxE with it.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => void importFile(event.currentTarget.files?.[0])}
        />
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
          <HugeiconsIcon icon={Upload04Icon} data-icon="inline-start" />
          Import
        </Button>
        <Button size="sm" onClick={() => newThemeFrom(state.activeId)}>
          <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
          New from current
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {themes.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} active={theme.id === state.activeId} />
        ))}
      </div>
    </div>
  );
}

export function ThemesTab() {
  const editing = useStore(themeStore, (state) => state.draft !== null);
  useEffect(installSwatchStyles, []);
  return editing ? <ThemeEditor /> : <ThemeGallery />;
}
