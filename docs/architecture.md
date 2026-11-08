# RxE Next: architecture and feature API (proposal)

Status: approved and largely implemented. The "Decisions" and "Implementation notes" sections
at the end record what changed while building it.

## Problem

RxE has to change EmeraldChat in every way the old RxE did, and more:

- message rendering (rich text, mentions, embeds, gender borders, image controls)
- chat behaviour (commands, antispam, mutes, multiline input, image upload)
- profiles and menus, karma tracking, moderation tools
- a full theming system

The target is a Next.js 14 static export that redeploys often. Every way in is a
different mechanism, and each has its own failure mode:

| Way in                                   | Failure mode                                             |
| ---------------------------------------- | -------------------------------------------------------- |
| AnyCable frames                          | Stable; the protocol is unchanged from the old Rails app |
| REST responses (axios over XHR)          | Stable                                                   |
| React context values                     | Stable property names                                    |
| Webpack module source                    | Changes on most deploys                                  |
| DOM structure and CSS-module class names | Changes whenever markup changes                          |

Decisions already made:

- Features are first-party only.
- RxE's UI uses React 19 + Base UI + shadcn + Tailwind, inside shadow roots.
- Themes: tokens, custom CSS, wallpapers and effects, import/export, and a live editor.
- Patching site modules is allowed freely.
- Storage is local, plus import/export.
- Distribution: Chrome Web Store, Firefox Add-ons, GitHub releases, and a userscript.
  Store rules mean no remote code; this is fine because everything is bundled.

The design question is how a feature author expresses _what_ they want to change,
without each feature re-deriving _how_ to reach into the site, and without one
site deploy breaking many features in different ways.

## Usage (caller's view)

A feature is one folder under `src/features/`. Its author never writes a
selector, a cable frame, a module regex, or a localStorage key. Those belong to
`src/site/` and `src/core/`.

```ts
// src/features/chat-commands/index.ts
export default defineFeature({
  id: "chat-commands",
  name: "Chat commands",
  description: "Type .shrug, .tableflip and friends.",
  category: "chat",
  settings: {
    signature: setting.boolean({ label: "Add RxE signature", default: false }),
  },
  setup({ chat }) {
    chat.outgoing((draft) => {
      const expanded = expandCommand(draft.text);
      if (expanded === null) return; // not a command, leave untouched
      return { ...draft, text: expanded };
    });
  },
});
```

```tsx
// src/features/rich-text/index.tsx: changes how message text renders
export default defineFeature({
  id: "rich-text",
  name: "Rich text",
  description: "Markdown-style bold, italics, links and inline emotes.",
  category: "chat",
  setup({ messages }) {
    messages.renderText((text, message) => <RichText text={text} mentions={message.mentions} />);
  },
});
```

```tsx
// src/features/gender-borders/index.tsx: decorates existing UI and reads settings
export default defineFeature({
  id: "gender-borders",
  name: "Gender borders",
  category: "appearance",
  settings: {
    palette: setting.select({
      label: "Colours",
      options: ["classic", "pastel"],
      default: "classic",
    }),
  },
  setup({ messages, settings }) {
    messages.decorateAvatar((user) => ({
      className: ringClass(user.gender, settings.palette.value),
    }));
  },
});
```

```tsx
// src/features/mute-everywhere/index.ts (exists today in older form)
export default defineFeature({
  id: "mute-everywhere",
  name: "Mute everywhere",
  category: "chat",
  setup({ chat, site }) {
    chat.incoming((event) => (site.mutes.has(event.author.id) ? drop : undefined));
  },
});
```

```tsx
// src/features/user-actions/index.tsx: adds UI to a site surface
setup({ ui, site }) {
  ui.userCard.addAction(({ user }) => (
    <Button variant="ghost" onClick={() => site.mutes.add(user)}>Perma-mute</Button>
  ));
  ui.accountMenu.addItem(<SettingsMenuItem />);   // exists today in raw form
}
```

```ts
// Escape hatch: a one-off patch that no surface covers yet.
export default defineFeature({
  id: "fast-skip",
  // Applied while chunks load, so toggling this feature takes effect after a reload.
  patches: [
    {
      find: '"MatchChannel"',
      replace: { match: /setTimeout\((\i),3e3\)/, with: "setTimeout($1,$self.delay())" },
    },
  ],
  setup({ settings }) {
    return { delay: () => settings.delay.value }; // exposed to the patch as `$self`
  },
});
```

Themes are not features. They are a core subsystem with their own panel tab:

```ts
themes.apply(theme); // live preview while editing
themes.save(theme);
themes.export(theme.id); // → string
themes.import(text); // validated; throws ThemeImportError on a bad payload
```

## Shape

### Module map

```
src/
  main.ts                 boot at document_start: install taps, start runtime
  core/                   site-agnostic engine
    runtime.ts            feature lifecycle, scopes, capability gating
    feature.ts            defineFeature, FeatureContext types
    settings.ts           typed setting schema → persisted zustand store, import/export
    scope.ts              Scope: collects disposers; one per running feature
  platform/               raw hooking mechanics, no EmeraldChat knowledge
    cable.ts              WebSocket tap (exists)
    http.ts               XHR/fetch tap for axios responses
    webpack.ts            chunk interception, find/replace patcher, export wrappers
    react.ts              committed-tree walking, context lookup (exists as bridge.ts)
    dom.ts                watch / injectStyle (exists)
    route.ts              History API tap (exists)
  site/                   all EmeraldChat knowledge, and nothing else
    model.ts              domain types: User, ChatEvent, OutgoingMessage, branded ids
    wire.ts               wire formats ⇄ domain types (users, RoomChannel frames, speak)
    api.ts                SiteApi: current user, mutes (REST endpoints to come)
    context.ts            assembles a feature's scoped FeatureContext
    contexts.ts           typed React context shapes (auth, prefs, cable, groupChat)
    prefs.ts              the site's emerald_preferences (muted users)
    tokens.ts             the site's 64 design tokens, labelled and grouped for the theme editor
    surfaces/             extension points; each owns its patches, selectors and fallbacks
      chat.ts             incoming / outgoing chat pipeline
      messages.ts         renderText, decorateAvatar, decorateRow, messageActions
      composer.ts         input behaviour (multiline, paste, commands UI)
      accountMenu.ts      addItem
      userCard.ts         addAction, addSection
      header.ts           addButton
  themes/                 theme model, CSS engine, editor UI, built-in themes
  ui/                     React + Base UI + shadcn + Tailwind, mount(), shared components
  features/<id>/          one folder per feature
```

### The load-bearing decision: surfaces own the "how"

A **surface** is an extension point for one area of the site: chat, messages,
composer, account menu, user card. It is implemented once in `site/surfaces/`,
using whatever layer works best (cable, patch, context, DOM). It exposes a typed,
lifecycle-aware registration API.

Features only register handlers on surfaces. When a deploy breaks a regex or a
selector, one surface needs fixing and every feature using it recovers. This
applies the boundary-discipline principle: site knowledge is concentrated in one
place, with parsing to domain types at that boundary.

Surface patches are applied unconditionally while chunks load. They inject calls
like `$rxe.messages.renderText(text, msg)`, and those calls are identity
functions when no feature has registered. As a result, enabling or disabling a
feature takes effect immediately, with no reload.

### Types (sketch)

```ts
// core/feature.ts
interface FeatureDefinition<S extends SettingsSchema = {}> {
  id: string;
  name: string;
  description: string;
  category: "chat" | "appearance" | "profiles" | "moderation" | "utility";
  settings?: S;
  /** Only for mods, only on some routes, etc. Re-evaluated on route and user change. */
  when?: (env: Environment) => boolean;
  /** Raw patches. Applied at chunk load only if enabled at boot; changes need a reload. */
  patches?: readonly Patch[];
  setup(context: FeatureContext<S>): void | PatchSelf;
}

interface FeatureContext<S> {
  settings: SettingsHandle<S>; // .value, .set(), .subscribe(); typed from the schema
  chat: ChatSurface;
  messages: MessagesSurface;
  composer: ComposerSurface;
  ui: { accountMenu: AccountMenuSurface; userCard: UserCardSurface; header: HeaderSurface };
  site: SiteApi; // current user, mutes, rooms, REST calls, all typed
  raw: RawAccess; // escape hatch: cable, dom, webpack, react
  log: Logger;
}
// Every registration made through the context is tied to the feature's Scope and
// undone automatically on teardown. Features never write their own teardown code.
```

```ts
// site/model.ts: what features see instead of frames
interface User { id: UserId; name: string; username: string; gender: Gender; karma: number; … }
type ChatEvent =
  | { kind: "message"; room: RoomId; author: User; text: string[]; picture: string | null }
  | { kind: "typing"; room: RoomId; author: User }
  | { kind: "joined" | "left"; room: RoomId; user: User };
type UserId = number & { readonly __brand: "UserId" };

// site/surfaces/chat.ts
interface ChatSurface {
  incoming(handler: (event: ChatEvent) => ChatEvent | typeof drop | void): void;
  outgoing(handler: (draft: OutgoingDraft) => OutgoingDraft | typeof drop | void): void;
  send(room: RoomId, text: string): void;
}

// site/surfaces/messages.ts
interface MessagesSurface {
  renderText(render: (text: string, message: RenderedMessage) => ReactNode): void;
  decorateAvatar(decorate: (user: User) => Decoration): void;
  decorateRow(decorate: (message: RenderedMessage) => Decoration): void;
  addAction(action: MessageAction): void;      // hover toolbar on a message
}
```

```ts
// core/settings.ts
const setting = {
  boolean(options: { label: string; default: boolean; description?: string }): BooleanSetting;
  select<T extends string>(options: { label: string; options: readonly T[]; default: T }): SelectSetting<T>;
  number(options: { label: string; default: number; min?: number; max?: number; step?: number }): NumberSetting;
  text(options: { label: string; default: string; multiline?: boolean }): TextSetting;
  color(options: { label: string; default: string }): ColorSetting;
  list<T>(options: { label: string; default: T[]; item: ItemSchema<T> }): ListSetting<T>;
  custom<T>(options: { default: T; render: ComponentType<SettingEditorProps<T>> }): CustomSetting<T>;
};
// The settings panel renders every feature's schema automatically, grouped by category.
// All values live in one persisted store (`rxe:settings`, versioned), so export/import
// is a single JSON document covering settings and themes.
```

```ts
// themes/model.ts
interface Theme {
  id: string;
  name: string;
  schema: 1;
  tokens: Partial<Record<SiteToken, string>>; // the site's own --primary-500, --base1-850, …
  typography?: { family: string; scale: number };
  shape?: { radius: number; density: "compact" | "cozy" };
  wallpaper?: { kind: "image" | "gradient"; value: string; blur: number; dim: number };
  effects?: { glass: boolean; accentGlow: boolean };
  customCss?: string;
}
// The engine compiles a Theme into one stylesheet on the site:
//   1. token overrides on :root
//   2. site/fixes.global.css, which maps the site's ~89 hardcoded colours onto tokens
//   3. wallpaper and effect rules
//   4. customCss
// RxE's own UI derives its tokens from the site's tokens, so it re-themes automatically.
```

```ts
// platform/webpack.ts
interface Patch {
  /** A string or regex that identifies exactly one module factory by its source. */
  find: string | RegExp;
  replace: Replacement | readonly Replacement[];
}
interface Replacement {
  match: RegExp; // `\i` expands to a minified-identifier pattern
  with: string; // `$self` → the feature's PatchSelf, `$rxe` → the surface registry
}
// Chunks are intercepted by owning `self.webpackChunk_N_E` before Next's runtime loads.
// A patch whose `find` or `match` hits nothing is reported in the panel; the
// surface or feature that owns it shows "broken by site update".
```

### Interface depth

- **What features see:** about six surface interfaces, plus `site`, `settings` and `log`.
- **What that hides:**
  - cable frame formats and identifiers
  - minified module source and regexes
  - CSS-module class hashes
  - the React tree layout
  - localStorage keys
  - teardown bookkeeping
  - how a deploy break is detected and reported
- **What deliberately stays exposed:** `raw` and `patches`, for the long tail that
  no surface covers yet. Using them is a signal to promote the pattern into a surface.

## Synthesis decision

Two whole-shape candidates were sketched.

**A. Context-object features.** Each feature receives the platform layers
directly (`ctx.cable`, `ctx.dom`, `ctx.webpack`, `ctx.react`) and builds its own
hooks. This is roughly today's shape.

- Simple to build.
- Shallow: every feature re-learns site internals.
- Leaky: the same selector or frame shape is copied into many features.
- A single site deploy breaks many features, each in its own way.

**B. Pure declarative contributions.** Features export static data only, such as
`contributes: { "accountMenu.items": [...], "messages.text": fn }`, with no setup code.

- Deep and inspectable.
- Too rigid for stateful features (antispam scoring, karma polling) that need
  timers, subscriptions and their own state.

**Chosen: B's extension points, with A's lifecycle and an escape hatch.**

- From B: surfaces as the only place site knowledge lives, and typed domain
  events instead of frames.
- From A: an imperative `setup(context)` with automatic scoping, so stateful
  features stay natural.
- From A as well: `raw` and `patches`, kept as an explicit, visible escape hatch
  instead of the default.

## Tradeoffs accepted

- **Up-front surface work.** We write and maintain a surface before the features
  that need it. In exchange, a site deploy is fixed in one place.
- **Surface patches always applied.** They run even when no feature uses them, as
  cheap identity calls. In exchange, every feature toggles live without a reload.
- **Feature-level raw patches need a reload to toggle.** The chunk has already
  been evaluated by the time you toggle. The panel says so on those features.
- **One settings store and one theme store.** No per-feature storage keys. In
  exchange, export/import is trivial and keys can't collide.
- **RxE UI is always in shadow roots**, even single menu items. In exchange,
  Tailwind and preflight can never touch the site, and the site's CSS can never
  touch RxE.
- **A ~375 KB bundle**, mostly React and react-dom. It loads from disk, not the
  network, so it isn't a page-load cost.

## Alternatives considered

- **Patch-only (Vencord-style everything).** Every change goes through module
  patches.
  - Most powerful.
  - Exposes minified source to every feature.
  - Even protocol-level changes such as mutes and commands would break on deploys
    that only touch the UI.
  - Lost to the layered approach because the cable and context layers are far
    more stable for what they cover.
- **DOM-only.** Decorate after the site renders.
  - Fights React re-renders.
  - Can't change behaviour, only markup.
  - Many old-RxE features are impossible this way.
- **Borrow the site's React for RxE UI.** Rejected earlier: it ties RxE to the
  site's React version and module ids, and the site's CSS leaks in.

## Decisions (from review)

- **Shape:** approved as proposed.
- **Settings panel:** a sidebar with tabs: Chat, Appearance, Profiles,
  Moderation, Themes, Backup.
- **Moderation tools:** gated with `when: (env) => env.user.mod`. Built later,
  once someone with a mod account can test them.
- **Built-in themes:** ports of ritsu, light, teriblast and teriblast v2, plus a
  fresh set designed for the token system.
- **Wallpapers:** an image URL or a local upload. Uploads are stored in
  IndexedDB, not localStorage.

## Risks

1. **Deploy cadence.** Surface patches will break on some deploys. Proposal: a
   CI job that loads the live site daily, runs every `find` and `match`, and
   opens an issue listing anything that no longer matches.
2. **Userscript managers that inject late.** Module patches need
   `document_start`. Late injection already falls back for the cable layer; for
   patches it means surfaces fall back to DOM, or the feature reports "reload
   required".

## Next implementation step

Build `platform/webpack.ts` (chunk interception and the find/replace patcher),
then `site/surfaces/chat.ts` on top of the existing cable tap, and port
`mute-everywhere` to `setup({ chat, site })` as the first feature on the new
API.

## Implementation notes

- **Linting:** Biome, not ESLint. TypeScript 7 (the native port) ships no JS
  compiler API, which `typescript-eslint` requires. The design-system rules are
  GritQL plugins in `lint/`, with fixtures tested in `test/lint.test.ts`.
- **Validation:** Valibot, not Zod. Zod 4 doesn't tree-shake under esbuild: a
  single `z.object` bundled to 427 KB, against 3 KB for Valibot.
- **Patches:**
  - Surface patches can target several modules with `all: true`; the message
    text patch matches group chat, DMs and text chat.
  - Avatar decoration is class-based (`AVATAR_CLASSES`). The patched `Avatar`
    always tags users, and features only add stylesheets, so toggling is live
    even though `Avatar` is memoized.
- **Message text:** `messages.renderText` mounts an RxE React root inside the
  site's message cell. That happens only when a renderer actually changes the
  message; plain messages stay plain text nodes.
- **Hardcoded site colors:** handled at runtime by `themes/tokenizer.ts`, not
  by a maintained `fixes.global.css`. The tokenizer matches values to token
  defaults by role, so it needs no selectors.
