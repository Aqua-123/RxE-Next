# RxE Next

RxE for the Next.js version of EmeraldChat (`emeraldchat.com/app/*`). The original
[RxE](../RxE) keeps handling the old Rails app at `/old/app/*`. This project does
not run there.

## Install

```sh
bun install
bun run build        # dist/extension (MV3) and dist/rxe-next.user.js
bun run dev          # rebuild on change
bun run check        # typecheck, tests, build
```

- **Chrome or Edge:** open `chrome://extensions`, turn on Developer mode, click
  **Load unpacked**, and select `dist/extension`.
- **Firefox 128+:** open `about:debugging`, click **Load Temporary Add-on**, and
  select `dist/extension/manifest.json`.
- **Userscript:** install `dist/rxe-next.user.js`. It needs `@run-at document-start`
  and `@grant none`. If your manager injects it later than that, RxE still attaches
  through the fallback described below.

## How it hooks into the site

The new site is a static Next.js export. It has no page globals and no class
prototypes to patch, so RxE uses four layers, from most stable to most fragile.
Pick the most stable layer that can do the job.

| Layer | Module | Mechanism | Stability |
|---|---|---|---|
| Protocol | `platform/cable.ts` | Wraps `WebSocket` before the app loads. Reads, rewrites, or drops AnyCable frames (`RoomChannel`, `MatchChannel`, and others). | The backend protocol is the same as the old Rails app's |
| App bridge | `platform/bridge.ts` | Walks the committed React tree and finds context values by their property names (`auth`, `prefs`, `popups`, `cable`, `groupChat`, `router`). | Property names survive minification and redeploys |
| Modules | `platform/modules.ts` | Gets the site's webpack loader, and through it the site's React 18. | Module ids are based on package paths |
| DOM | `platform/dom.ts` | One shared observer. Selectors use `data-user-id`, `data-sentry-component`, and CSS-module prefixes such as `[class*="room_global_textContainer__"]`. | Breaks when markup changes |

`platform/route.ts` tracks client-side navigation through the History API.

If RxE loads after the app has already connected (late injection), `adoptTransport`
hooks the open socket. It also points AnyCable's stored constructor (`transport.Impl`)
at the wrapped `WebSocket`, so reconnects stay hooked.

## Features

Every feature is a `defineFeature({ id, requires, routes, setup })` whose `setup`
returns a teardown. `features/runner.ts` starts and stops features based on:

- the user's setting,
- the current route,
- whether the capabilities the feature needs are available (`cable`, `bridge`, `react`).

A feature whose hook is missing waits instead of throwing. Its status shows in the
RxE panel and in `RxE.features()`.

| Feature | What it does |
|---|---|
| `mute-everywhere` | The site's muted-users list only works in group chat. The checks on the messages page and in 1-on-1 chats are broken (`.includes()` on objects, and `.muted_users` read off a string). This feature drops muted users' messages and typing frames on every `RoomChannel`, hides their earlier messages, and imports the old RxE `permaMuteList` once. |
| `panel` | Adds an **RxE** header button that opens settings as a native site popup, rendered with the site's React. |

To add a feature, create `src/features/<id>.ts`, export a `defineFeature(...)`, and
add it to `FEATURES` in `src/main.ts`.

## Plugin API

`window.RxE` keeps the old event names: `room.join`, `room.leave`, `room.received`,
`user.joined`, `user.left`, `user.message`.

Events come from the cable protocol, not from site components. Calling
`preventDefault()` on an incoming event drops the frame before the site sees it.

```js
RxE.addEventListener("user.message", (event) => {
  if (event.messages.join(" ").includes("spam")) event.preventDefault();
});
```

## Settings storage

- RxE Next settings are stored under the `rxe-next:` key prefix in `localStorage`.
- The old RxE's settings (`ritsu-emerald-preference-*`) are on the same origin, so
  this project can read them for one-time imports (`core/storage.ts`, `legacyStore`).
