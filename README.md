# RxE Next

RxE for the Next.js version of EmeraldChat (`emeraldchat.com/app/*`). The
original [RxE](../RxE) keeps handling the old Rails app at `/old/app/*`. This
project does not run there.

It ships as a browser extension (Chrome, Edge, Firefox) and as a userscript,
built from the same code.

The design and the decisions behind it are in
[docs/architecture.md](docs/architecture.md).

- [Setup](#setup)
- [Features](#features)
- [Develop](#develop)
- [Writing a feature](#writing-a-feature)
- [Feature API](#feature-api)
- [Design system](#design-system)
- [Themes](#themes)

## Setup

### 1. Build

You need [Bun](https://bun.sh) 1.4 or newer.

```sh
git clone https://github.com/Aqua-123/RxE-Next.git
cd RxE-Next
bun install
bun run build
```

The build writes two things to `dist/`:

- `dist/extension/`: the browser extension (Manifest V3)
- `dist/rxe-next.user.js`: the userscript

### 2. Install

Use one of these. Don't install both, or RxE runs twice.

- **Chrome or Edge**
  1. Open `chrome://extensions` (or `edge://extensions`).
  2. Turn on **Developer mode**.
  3. Click **Load unpacked** and select the `dist/extension` folder.
- **Firefox 128 or newer**
  1. Open `about:debugging#/runtime/this-firefox`.
  2. Click **Load Temporary Add-on** and select `dist/extension/manifest.json`.
  3. Firefox removes temporary add-ons when it closes; load it again after a
     restart.
- **Userscript** (Tampermonkey or Violentmonkey)
  1. Open the manager's dashboard and create a new script, or drag
     `dist/rxe-next.user.js` onto the browser.
  2. Keep the script's `@run-at document-start` header. RxE changes the site's
     code as it loads, so it must start before the site's own scripts.
  3. In Chrome, Tampermonkey also needs **Allow user scripts** turned on in the
     extension's details page.

### 3. Use it

1. Open [emeraldchat.com/app](https://emeraldchat.com/app) and reload any tab
   that was already open.
2. Open **RxE Settings** from the account menu (your avatar, top right) or from
   the navigation drawer.
3. Turn features on or off and change their settings. Changes apply right away
   and are saved in the browser.

To update, pull the latest code, run `bun run build` again, and reload the
extension (the ↻ button on the extensions page) or reinstall the userscript.

## Features

Every feature can be turned off in RxE Settings, and most have options. The
settings panel has these tabs: Chat, Appearance, Profiles, Moderation, Themes
and Backup.

### Chat

- **Rich text:** formats `**bold**`, `*italic*`, `__underline__`,
  `~~strike~~`, `` `code` `` and `||spoilers||`. Also makes links clickable,
  highlights mentions of you, and enlarges messages that are only emoji. Each
  part has its own switch.
- **Text styles:** fancy letters that everyone sees, even without RxE:
  `~smallcaps~`, `^^superscript^^`, `,,hooked,,`, `<cursive>`,
  `<<bold cursive>>`, `[[squared]]`, `((circled))` and `{{medieval}}`.
- **Chat commands:** start a message with `.shrug`, `.tableflip`,
  `.tableflip2`, `.unflip` or `.out`. Any text after the command is sent before
  it.
- **Multi-line messages:** Shift+Enter starts a new line, and the box grows as
  you type. RxE users see the line breaks; others see spaces. Optionally, ↑ in
  an empty box brings back your last message.
- **Send links:** the site silently drops messages with links. RxE sends them
  with a look-alike dot (`youtu．be/…`) so they get through, and turns them back
  into working links, embeds and images for RxE users.
- **Email defanging:** the same for email addresses, which the site also drops.
- **Send images:** an image button in every chat, plus paste and drag-and-drop.
  Gold users send through the site's own upload where it has one; otherwise
  images are hosted on sxcu.net and show for RxE users.
- **Inline images:** shows the picture when a message is only a link to Imgur,
  sxcu.net, catbox.moe, ImgBB or Reddit's image host. GIFs can be turned off.
- **Embeds:** plays YouTube videos and Spotify music in chat when a message is
  only the link. YouTube and Spotify have separate switches.
- **Delivery status:** marks your messages that the site silently dropped (for
  example by its filter) as "Not delivered", with **Edit** to put the text back
  in the box.
- **Message times:** shows when each message was sent next to the sender's
  name, in every chat. Hover for the full date.
- **Join and leave notices:** "User X joined the chat." under group chat's last
  message for 5 seconds. Each one replaces the last, so busy rooms don't fill
  up. A leave is only announced if the person stays gone for 15 seconds.
- **Hide my typing:** others don't see "is typing..." while you write.
- **Mute everywhere:** applies your muted users to DMs and 1-on-1 chats (the
  site only enforces mutes in group chat). It can also hide their typing and
  their earlier messages.
- **Mute by name:** hides messages and typing from anyone whose display name
  matches one of your patterns, including their earlier group chat messages.
- **Online list tools:** sort group chat's online list (site order, name, newest
  or oldest account, karma), search it by name, and open anyone's profile by
  user ID.

### Appearance

- **Themes:** see [Themes in RxE Settings](#themes-in-rxe-settings) below.
- **Avatar borders:** rings avatars everywhere in the user's gender color, as a
  ring or a glow, 1 to 4 px thick.
- **Movable side panels:** on desktop, drag group chat's Channels and Online
  panels by the handle in their corner to either side of the chat, or above and
  below each other. The layout reflows live as you drag, Esc cancels, and the
  choice is remembered. You can also pick positions from two dropdowns in
  Settings.
- **Side panel buttons:** on small screens, turns the plain "Channels >" and
  "< Online Users" links into a button bar that shows how many people are online.
- **Recent conversations on the dashboard:** your six latest DMs under the
  dashboard's cards, showing who's online and what's unread.
- **Hide ads and upsells:** removes ads for Gold, Premium, Spark, gifts and
  karma. There are separate switches for ad banners, upgrade items in the
  account menu, Gold-locked features, and the Gold-only image button.
- **Header and popup fixes:** tooltips on the header's unlabelled icons, bigger
  header buttons on phones, a clear Close button on popups, and a clearer
  support form. Each fix has its own switch.
- **Your name as the tab title:** the browser tab shows your display name,
  like "Teriyaki - RxE Next 0.1.0", instead of the site's "Omegle alternative
  for…", so you can tell accounts apart. The version can be turned off.
- **Older versions in the account menu:** removes the header's "Choose Theme"
  button, which only links to the site's Legacy and Classic versions, and puts
  those links in the account menu under "Older versions".

### Themes in RxE Settings

- **Built-in themes:** Emerald (the site's own), Midnight, Sakura, Mocha, Ritsu,
  Light, Teriblast and Teriblast V2.
- **Theme editor:** a simple mode with a few seed colors, or full control over
  every site and RxE color token. Also a font, a wallpaper (a URL or an
  uploaded image), glass panels and custom CSS.
- **Import and export:** share themes as files.

### Backup

- **Export:** downloads one file with your feature toggles, settings and custom
  themes, including uploaded wallpapers.
- **Restore:** replaces your current RxE settings with a backup file.
- **Reset:** clears everything RxE has stored and reloads the page.

## Develop

```sh
bun install
bun run dev          # rebuild on change
bun run check        # lint, typecheck, tests, build: run before every commit
bun run format       # apply Biome's safe fixes and formatting
bun run build        # dist/extension (MV3) and dist/rxe-next.user.js
```

After a rebuild, reload the extension on the extensions page, then reload
EmeraldChat.

```
src/
  core/       feature runtime, Scope, settings schema and store, backup
  platform/   raw hooks: cable (WebSocket), webpack (module patcher), react, dom, route
  site/       all EmeraldChat knowledge: domain model, wire formats, tokens, surfaces
  themes/     theme model, built-in themes, compiler, engine, wallpapers
  ui/         React 19 + Base UI + shadcn + Tailwind, rendered in shadow roots
  features/   one folder per feature
lint/         GritQL rules for the design system, with fixtures proving they fire
test/         bun test suites
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

Then add it to `FEATURES` in `src/main.ts`. Surfaces run handlers in that order, so
where a feature sits decides, for example, which text renderer claims a message first.

- **Settings:** declare them with `setting.boolean`, `select`, `number` or
  `text`. The panel renders the controls automatically. Values are typed from
  the schema and validated on read.
- **Teardown:** everything registered through the context (`chat`, `messages`,
  `ui`, `site`, `settings.watch`, `after`) is undone when the feature stops.
  Features write no teardown code.
- **Site knowledge:** features never touch selectors, cable frames or module
  source. If a feature needs something the surfaces don't offer, add it to a
  surface in `site/surfaces/`.

## Feature API

### `defineFeature(definition)`

| Field | Meaning |
|---|---|
| `id` | Stable key. Settings are stored under it, so don't rename it. |
| `name`, `description` | Shown in RxE Settings. |
| `category` | `"chat"`, `"appearance"`, `"profiles"`, `"moderation"` or `"utility"`: the settings tab it appears under. |
| `settings` | Schema built with `setting.*`; see below. |
| `enabledByDefault` | Defaults to `true`. |
| `core` | Always on and hidden from settings, for RxE's own plumbing. |
| `when(env)` | Runs the feature only where this returns true. `env` has `path` (for example `/app/meet/group-chat`) and `user`. Re-evaluated on navigation and when the user loads. |
| `patches` | Raw webpack module patches, for changes no surface covers yet. They only apply if the feature was on at page load. |
| `setup(context)` | Called when the feature starts. Gets the context below. |

### Settings

```ts
setting.boolean({ label, description?, default })
setting.select({ label, description?, options: [{ value, label }], default })
setting.number({ label, description?, min, max, step, unit?, default })
setting.text({ label, description?, placeholder?, multiline?, default })
```

In `setup`, `settings.get()` returns the typed values, `settings.set(key, value)`
changes one, and `settings.watch(listener)` calls `listener` now and on every
change.

### The context

Everything `setup` receives. Every registration is tied to the feature and
undone when it stops.

| Member | What a feature can do |
|---|---|
| `settings` | `get()`, `set(key, value)`, `watch(listener)`. |
| `chat` | `incoming(handler)` sees every room event (group, DM, 1-on-1) before the site does: `message`, `typing`, `joined` and `left` `ChatEvent`s. `outgoing(handler)` sees every message and typing ping you send. A handler returns a rewritten event, `drop` to discard it, or `undefined` to pass it on. |
| `composer` | `transform(fn)` rewrites what you type when you press Enter. `addButton(render)` adds a control after every chat box. `onFiles(fn)` receives pasted or dropped images. `send(text)` and `draft(text)` send or prefill the box on screen. `multiline()`, `onSent(fn)`, `onKeyDown(fn)`. `hasSiteUpload()` and `sendWithSiteUpload(file)` use the site's Gold image upload. |
| `messages` | `renderText(renderer)` replaces how message text renders in group chat, DMs, text chat and video chat; the first renderer to return content wins. `rewriteText(fn)` changes text before anything renders, for example to undo an encoding. `annotate(fn)` adds content after a message. `renderGroupTime(fn)` renders next to the sender's name. `hideAuthors(ids)`, `hideAuthorsWhere(predicate)`, `showLineBreaks()`, `flash(room, node, ms?)` for a passing status line in group chat, `refresh()`. |
| `userList` | Group chat's online list: `sortBy(order)`, `filterBy(predicate)`, `addTools(render)`, where `render` gets `openProfile(id)`. |
| `ui.accountMenu` | `addItem(render)` adds an item above Logout; `render` gets `close()`. |
| `ui.chrome` | The site's header, navigation drawer, dashboard and popups: `addNavItem(render)`, `addDashboardSection(render)`, plus the fixes `headerTooltips()`, `largerHeaderTargets()`, `clearPopupClose()` and `clearerSupportForm()`. |
| `ui.groupLayout` | Group chat's side panels on desktop: `arrange(placement, { animate? })`, `addPanelControl(render)`, `box()`, `setDragging(panel)`. Placement logic is in `site/panelLayout.ts`. |
| `ui.sidebars` | `renderToggle(render)` replaces the side panel links on narrow screens. |
| `ui.overlay(node)` | Mounts page-level UI (dialogs, panels) in an RxE shadow root. |
| `ui.siteStyle(id, css)` | Sets a stylesheet on the site, for classes surfaces expose, such as `AVATAR_CLASSES`. Calling it again with the same `id` replaces it. Colors must come from theme tokens. |
| `site` | `currentUser()`, `recentConversations()`, and `mutes.has(id)` / `mutes.watch(listener)`. |
| `after(ms, callback)` | A timer that's cancelled if the feature stops. Returns a cancel function. |
| `log` | `info`, `warn` and `error`, printed to the console with an RxE tag. |

Domain types (`User`, `ChatEvent`, `RoomId`, `UserId`, `Conversation`) are in
`site/model.ts`. Surfaces convert the site's wire formats to them, so features
never see raw cable frames.

### Example: a chat feature

```tsx
import { defineFeature } from "@/core/feature";
import { drop } from "@/site/surfaces/chat";

export default defineFeature({
  id: "no-shouting",
  name: "No shouting",
  description: "Hides messages written entirely in capitals.",
  category: "chat",
  setup({ chat }) {
    chat.incoming((event) => {
      if (event.kind !== "message") return undefined;
      const text = event.text.join(" ");
      return text.length > 8 && text === text.toUpperCase() ? drop : undefined;
    });
  },
});
```

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
