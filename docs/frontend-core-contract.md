# Frontend Core Contract

`backpack-game-core` may expose browser-safe DTO helpers, headless state
helpers, and neutral Vue component primitives. Product repos own page shells,
themes, routes, copy, haptics, images, payment UX, and policy.

## Public Vue Exports

- `@microwavedev/backpack-game-core/client/application`
- `@microwavedev/backpack-game-core/vue`
- `@microwavedev/backpack-game-core/vue/app`
- `@microwavedev/backpack-game-core/vue/pages`
- `@microwavedev/backpack-game-core/vue/components`
- `@microwavedev/backpack-game-core/vue/composables`

The core may own complete product-neutral page and application shells when two
consumers require identical structure and behavior. Products still inject
locale-ready labels, catalog DTOs, asset resolvers, service ports, route
extensions, integrations, feature policy, and theme tokens.

The root package export stays framework-neutral. Vue components are plain Vue 3
option objects so the core package does not require a build step. Browser-safe
composables may be plain JavaScript helpers when they do not need Vue runtime
imports.

## Application Facades

The `client/application` facade defines the product boundary without depending
on a Vue singleton:

- `validateGameApplicationAdapter` validates locale, asset, capability,
  integration, route-extension, and service-port contracts.
- `createApplicationServiceRegistry` owns the standard domain-port names:
  `session`, `catalog`, `profile`, `run`, `replay`, `social`, `wallet`,
  `assets`, `settings`, and `support`.
- Registries expose optional lookup through `get` and fail-fast lookup through
  `getRequired`.
- Consumers may declare service requirements per capability. A service is
  mandatory only when its capability is enabled.
- `ApplicationError` and `normalizeApplicationError` give page controllers a
  stable error shape without prescribing HTTP, persistence, or provider
  behavior.

The `vue/app` facade owns the common shell layer:

- `createScreenRegistry` combines core screens with product route extensions,
  applies capability gates, and evaluates injected route guards.
- `createNavigationItems` derives ordered navigation from currently available
  screens.
- `ScreenOutlet`, `GameShell`, and `GameApplicationRoot` are plain Vue option
  objects with stable structural classes and neutral events.
- `createGameApplication` returns `{ rootComponent, rootProps }`. The consumer
  supplies Vue's `createApp` and decides where and when to mount.

Application facades do not read `window`, history, storage, timers, endpoint
constants, SDK globals, or product assets. Those behaviors enter through the
adapter, service ports, host integrations, and route context.

## Peer Dependency

Vue 3 is an optional peer dependency. Consumers that render the Vue components
must provide Vue; consumers that only use mechanics or DTO helpers do not need
Vue installed.

## Component Rules

- Components accept DTOs shaped by `client-view-model` helpers.
- Components emit neutral product-agnostic events such as `roll`, `burn`,
  `select`, `buy`, `place`, `remove`, or `open`.
- Components may expose slots for product copy, visuals, and per-row rendering.
- Components may ship minimal structural markup and optional class hooks.
- Battle/replay shells such as `FighterCard` should use neutral combatant
  naming and receive product grid components, image paths, copy, and class hooks
  through props or wrappers.
- Prep/control widgets such as `RunHud`, `SellZone`, and `PrepActions` should
  use neutral run summary, run-currency, item-drag, and action-state
  terminology. Products map legacy fields such as local run money names, icons,
  mode names, and route/action event names in wrappers.
- Prep page shells such as `PrepScreen` should receive readiness state,
  round labels, reconnecting state, and product-provided slots for HUD,
  loadout, shop, actions, and overlays. Core owns only the outer prep layout
  and stable class hooks. Headless prep helpers such as
  `createPrepGridController` and `shapePrepScreenViewState` may own neutral bag
  rows, effective row counts, disabled-cell checks, placement previews,
  first-fit bag anchors, refresh-cost labels, and sell-price labels. Neutral
  prep command planners may also return next-array plans for place/move,
  activate/deactivate/move/rotate bag, and related displacement commands.
  Product repos still own applying those plans to their live store, API
  persistence, haptics, route events, shop purchase/sell/refresh side effects,
  fusion reveal queue mutation, local error copy, and final rendering slots.
- Inventory/drop-zone widgets such as `BackpackZone` should receive resolved
  item DTOs, labels, stat formatters, highlight sets, and visual slots from the
  product app. Core owns only stable structure, event names, and class hooks.
- Inventory/grid-section widgets such as `InventoryZone` should receive
  prepared item rows, active container chip DTOs, labels, grid metadata, and
  grid/footer slots from the product app. Core owns event bridging, chip
  structure, and class hooks, while placement rules and stat rendering stay in
  product wrappers.
- Shop widgets such as `ShopZone` should receive already-shaped offer rows,
  labels, refresh state, sell-zone state, row class/attribute hooks, and visual
  slots from the product app. Core owns the shell, refresh event, buy event,
  neutral sell-zone event bridge, and class hooks; pricing/catalog/fusion
  policy remains product-local.
- Recipe surfaces such as `RecipeCard` and `RecipeList` should receive
  already-shaped recipe DTOs with localized result copy plus visual/stat slots
  from the product app. Core owns repeated recipe structure, active/interactive
  state, keyboard selection, data attributes, and class hooks; catalog lookup,
  fusion recipe sources, artifact grid rendering, and stats remain product-local.
- Catalog shells such as `ArtifactCatalogBrowser` should receive already-shaped
  group rows, selected-detail facts, selected recipe DTOs, labels, and
  visual/stat slots from the product app. Core owns the layout, detail close
  event, item select event, resize observation event, data attributes, and class
  hooks; catalog sorting/grouping, recipe sources, artifact previews, and stats
  remain product-local.
- Catalog page shells such as `CatalogPageScreen` should receive cover labels,
  class hooks, and catalog content through slots. Core owns only the generic
  page frame; product copy, route placement, catalog browser/data wiring, and
  final styling remain product-local.
- Replay shells such as `ReplayDuel` should receive already-shaped fighter DTOs,
  prepared grid props, role summaries, attribution groups, visual-effect DTOs,
  labels, and replay-speed state from the product app. Core owns the duel
  layout, replay-speed controls, role/attribution chip structure, neutral
  `set-speed` event, and fighter/grid slots; product combatant shaping,
  artifact lookups, visual effects, replay timeline state, and final battle
  page composition remain product-local.
- Replay page shells such as `ReplayScreen` should receive result/reward
  summaries, battle summary rows, battle-log rows, continuation labels, and
  collapse state as neutral DTOs. Core owns the replay page layout, result
  sheet structure, battle-log placement, neutral result/log events, and a
  battle-stage slot; product route navigation, replay timeline state,
  localization, currency labels, reward policy, combatant DTO shaping, and
  final fighter rendering remain product-local.
- Run summary shells such as `RunSummaryScreen` should receive one localized
  DTO containing title, outcome, character image/name, stat rows, replayable
  round rows, and the home label. Core owns stable summary structure and emits
  neutral `home` and `open-round` events; products own run-to-DTO projection,
  outcome policy, locale dictionaries, character catalogs, replay navigation,
  asset resolution, and final styling.
- Animation shells such as `FusionReveal` should own timing, structural
  classes, and layout math while receiving already-resolved artifact DTOs,
  labels, and visual slots from product wrappers.
- Core may own structural CSS, responsive layout, stable class hooks, and
  interaction states for shared pages. Product repos own theme tokens,
  localization, image resolvers, Telegram wrappers, haptics, route extensions,
  payment/compliance policy, and any truly product-only page.
- Shared application pages and shells consume service ports and route context.
  They must not import product stores, endpoint strings, or consumer code.
- Optional product pages are route extensions registered with the same shell;
  they must not fork navigation or application initialization.

## Composable Rules

- Composables must accept browser globals such as `window` through options or
  detect them safely for SSR/test contexts.
- Composables may expose subscription/getter APIs or Vue-compatible helpers,
  but they must not import product stores directly.
- Product repos own settings persistence, CSS class attachment, telemetry,
  haptics, and route-specific side effects.

## Forbidden Imports

Core client/Vue exports must not import product repos, product assets, Express,
Sequelize, Telegram helpers, payment provider SDKs/webhook code, or Node-only
modules from browser-safe entry points.

## Validation

Each shared frontend slice should include:

- core package export/type tests;
- core component/composable smoke or render tests;
- Mushroom adoption evidence, including screenshots when visual behavior
  changes;
- Meat import/build/test evidence against the same core commit.
