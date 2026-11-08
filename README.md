# RxE Next

RxE for the Next.js version of EmeraldChat (`emeraldchat.com/app/*`). The
original [RxE](../RxE) keeps handling the old Rails app at `/old/app/*`. This
project does not run there.

The design, the feature API and the decisions behind both are in
[docs/architecture.md](docs/architecture.md).

## Develop

```sh
bun install
bun run dev          # rebuild on change
bun run check        # typecheck, tests, build
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
  core/        feature runtime, Scope, defineFeature, settings storage
  platform/    raw hooks: cable (WebSocket), webpack (module patcher), react, dom, route
  site/        all EmeraldChat knowledge: domain model, wire formats, surfaces
  ui/          React 19 + Base UI + shadcn + Tailwind, rendered in shadow roots
  features/    one folder per feature
```

## Writing a feature

```ts
import { defineFeature } from "@/core/feature";
import { drop } from "@/site/surfaces/chat";

export default defineFeature({
  id: "mute-everywhere",
  name: "Mute everywhere",
  description: "…",
  category: "chat",
  setup({ chat, messages, site }) {
    chat.incoming((event) =>
      event.kind === "message" && site.mutes.has(event.author.id) ? drop : undefined
    );
    site.mutes.watch((ids) => messages.hideAuthors(ids));
  },
});
```

Then add it to `FEATURES` in `src/main.ts`.

- Everything registered through the context is undone when the feature stops,
  so features have no teardown code.
- Features never touch selectors, cable frames or module source. If a feature
  needs something the surfaces don't offer yet, add it to a surface in
  `site/surfaces/`.
- Raw `patches` are available as an escape hatch.

## UI

- RxE UI is React 19 with shadcn components (`base-nova` style, built on Base
  UI), Tailwind v4 and Hugeicons.
- Add components with `bun x shadcn add <name>`. They land in
  `src/ui/components/ui/`.
- Components that portal (dialogs, popovers, menus) must portal into
  `usePortalContainer()`. See `dialog.tsx` for the pattern.
- Every RxE component renders inside its own shadow root through
  `ui/mount.tsx`. The single compiled stylesheet
  (`ui/styles/rxe.tailwind.css`) is adopted into those roots only, so Tailwind
  never reaches the site and the site's CSS never reaches RxE.
