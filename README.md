# RxE Next

RxE for the Next.js version of EmeraldChat (`emeraldchat.com/app/*`). The
original [RxE](../RxE) keeps handling the old Rails app at `/old/app/*`. This
project does not run there.

The design and the decisions behind it are in
[docs/architecture.md](docs/architecture.md).

## Develop

```sh
bun install
bun run dev          # rebuild on change
bun run check        # lint, typecheck, tests, build
bun run format       # apply Biome's safe fixes and formatting
bun run build        # dist/extension (MV3) and dist/rxe-next.user.js
```

- **Chrome or Edge:** open `chrome://extensions`, turn on Developer mode, click
  **Load unpacked**, and select `dist/extension`.
- **Firefox 128+:** open `about:debugging`, click **Load Temporary Add-on**, and
  select `dist/extension/manifest.json`.
- **Userscript:** install `dist/rxe-next.user.js`. It needs
  `@run-at document-start`; module patches only apply if RxE loads before the
  site's scripts.

## Layout

```
src/
  core/       feature runtime, Scope, settings schema and store, backup
  platform/   raw hooks: cable (WebSocket), webpack (module patcher), react, dom, route
  site/       all EmeraldChat knowledge: domain model, wire formats, tokens, surfaces
  themes/     theme model, built-in themes, compiler, engine, wallpapers
  ui/         React 19 + Base UI + shadcn + Tailwind, rendered in shadow roots
  features/   one folder per feature
lint/         GritQL rules for the design system, with fixtures proving they fire
```

## Writing a feature

```tsx
import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";

export default defineFeature({
  id: "avatar-borders",
  name: "Avatar borders",
  description: "Rings avatars in the user's gender color.",
  category: "appearance", // the settings tab it appears under
  settings: {
    style: setting.select({
      label: "Style",
      options: [{ value: "ring", label: "Ring" }, { value: "glow", label: "Glow" }],
      default: "ring",
    }),
    width: setting.number({ label: "Thickness", min: 1, max: 4, step: 1, unit: "px", default: 2 }),
  },
  setup({ ui, settings }) {
    settings.watch(({ style, width }) => ui.siteStyle("borders", css(style, width)));
  },
});
```

Then add it to `FEATURES` in `src/main.ts`.

- **Settings:** declare them with `setting.boolean`, `select`, `number` or
  `text`. The panel renders the controls automatically. Values are typed from
  the schema and validated on read.
- **Teardown:** everything registered through the context (`chat`, `messages`,
  `ui`, `site`, `settings.watch`) is undone when the feature stops. Features
  write no teardown code.
- **Site knowledge:** features never touch selectors, cable frames or module
  source. If a feature needs something the surfaces don't offer, add it to a
  surface in `site/surfaces/`.

| Surface | What a feature can do |
|---|---|
| `chat` | See every room event before the site does (domain `ChatEvent`s), and rewrite or `drop` them. Same for outgoing messages. |
| `messages` | `renderText(renderer)` replaces how message text renders in group chat, DMs, text chat and video chat, via module patches. `hideAuthors(ids)`. `refresh()`. |
| `ui` | `accountMenu.addItem`, `overlay(node)` for page-level UI, `siteStyle(id, css)` for site stylesheets (for example against `AVATAR_CLASSES`). |
| `site` | Current user, muted users. |

## Design system

All RxE UI uses one design system: shadcn components (`base-nova`, built on
Base UI), Tailwind v4 and Hugeicons, themed by tokens. `bun run lint` enforces
it with custom GritQL rules in `lint/`:

- **No inline styles.** No JSX `style` props, no `element.style.*` writes, and
  no `setAttribute("style")`. Dynamic colors go through generated stylesheets
  keyed by data attributes. `features/settings/themes/previewStyles.ts` shows
  the pattern.
- **No hardcoded colors.** Hex values, `rgb()`/`oklch()`/`color-mix()`,
  arbitrary Tailwind colors (`bg-[#fff]`, `bg-[var(--x)]`) and palette classes
  (`text-white`) are all rejected, in TS and CSS alike.
  - Tailwind's palette is switched off, so only semantic tokens exist:
    `bg-card`, `text-primary`, `text-link`, `bg-mention` and so on.
  - Colors may only be defined in `ui/styles/tokens.css`, `site/tokens.ts`
    and `themes/builtin/`.
- **Portals stay in the shadow root.** Every `*.Portal` must pass
  `container={usePortalContainer()}`. New shadcn components with portals get
  flagged until they do.

`test/lint.test.ts` runs the rules against `lint/fixtures/` on every test run,
so a rule that stops firing fails the build.

Add components with `bun x shadcn add <name>`. They land in
`src/ui/components/ui/`.

## Themes

A theme is data, validated with Valibot:

- a base (dark or light)
- overrides for any of the site's 72 tokens and RxE's 11
- seeds for the editor's simple mode
- a font stack
- a wallpaper (URL, or an upload stored in IndexedDB)
- glass panels
- custom CSS

`themes/compile.ts` turns a theme into one stylesheet on `:root:root`. The engine
applies it at `document_start`, so the first paint is already themed. RxE's own
UI derives its colors from the same tokens.

About a quarter of the site's color rules hardcode values. Where a value equals
a token's default, `themes/tokenizer.ts` rewrites it to `var(--token)`, matched
by role. It works on any selector and survives site deploys.
