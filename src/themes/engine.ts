import { injectStyle } from "@/platform/dom";
import { GLASS_TARGETS } from "@/site/themeTargets";
import { compileTheme } from "./compile";
import type { Theme } from "./model";
import { appliedTheme, themeStore } from "./store";
import { buildTokenIndex, tokenizeRules } from "./tokenizer";
import { wallpaperUrl } from "./wallpapers";

let generation = 0;

/**
 * Applies the theme. Runs synchronously so the first paint is already themed; an
 * uploaded wallpaper (async IndexedDB read) is filled in once it resolves.
 */
function render(theme: Theme): void {
  const run = ++generation;
  const source = theme.wallpaper?.source;
  const apply = (url: string | null) => {
    if (run === generation)
      injectStyle("theme", compileTheme({ theme, wallpaperUrl: url, glassTargets: GLASS_TARGETS }));
  };
  apply(source?.kind === "url" ? source.url : null);
  if (source?.kind === "upload") void wallpaperUrl(source.id).then(apply);
}

/** Rewrites the site's hardcoded colors to tokens, once per stylesheet as each one loads. */
function startSiteFixes(): void {
  const index = buildTokenIndex();
  const processed = new WeakSet<CSSStyleSheet>();
  const fixes: string[] = [];

  const scan = () => {
    let changed = false;
    for (const sheet of document.styleSheets) {
      if (processed.has(sheet)) continue;
      processed.add(sheet);
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin stylesheet
      }
      const css = tokenizeRules(rules, index);
      if (css) {
        fixes.push(css);
        changed = true;
      }
    }
    if (changed) injectStyle("theme-site-fixes", fixes.join("\n"));
  };

  // `load` doesn't bubble, but it can be captured: catches every <link rel=stylesheet> the site adds.
  document.addEventListener(
    "load",
    (event) => {
      if (event.target instanceof HTMLLinkElement || event.target instanceof HTMLStyleElement)
        scan();
    },
    true
  );
  document.addEventListener("DOMContentLoaded", scan);
  scan();
}

export function startThemeEngine(): void {
  // Sheet order matters: token fixes first, then the theme (whose custom CSS must win).
  injectStyle("theme-site-fixes", "");
  render(appliedTheme());
  themeStore.subscribe((state) => render(appliedTheme(state)));
  startSiteFixes();
}
