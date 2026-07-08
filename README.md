# Backpack Game Core

Reusable pure mechanics for backpack/grid games.

This package intentionally contains no database, HTTP, payment, catalog, UI, or
product-lore code. Product games should pass plain data objects into these
helpers and keep persistence, asset ownership, wallet state, and game-specific
catalogs in their own repos.

## Release Discipline

The current release channel is submodule-only: consumers pin a core Git commit
through `vendor/backpack-game-core` and a local `file:` dependency. The full
release policy, compatibility rules, and cross-consumer gate are documented in
[`docs/release-discipline.md`](docs/release-discipline.md).

## Current Modules

- `bag-shape`: shape masks, quarter-turn rotation, effective dimensions, and
  shape-cell checks for irregular bags.
- `grid-geometry`: serialized grid cells, footprint expansion, and set
  intersection helpers.
- `rng`: browser-safe deterministic numeric-seed RNG, integer rolls, and
  non-mutating seeded shuffle helpers.
- `fusion-matching`: pure adjacent-ingredient matching with product policy
  hooks.
- `artifact-fusion-recipes`: recipe normalization, lookup, ingredient-policy,
  and evaluator helpers over product-provided fusion recipes and artifact
  catalogs.
- `shop-offer`: deterministic offer generation over injected item pools, plus
  run-shop buy/refresh/sell state planners over injected offer/currency
  snapshots.
- `run-lifecycle`: run start, initial/next shop state, starter loadout, ghost
  budget, round result, and group-completion planners over injected config and
  state snapshots, plus provider-driven run-state summary DTO shaping.
- `modules/season`: season scoring, progression summary, end-reward lookup,
  and run-achievement evaluator factories over product-provided season levels,
  current-season metadata, achievement definitions, priority tables, and badge
  symbol adapters.
- `backpack-loadout`: provider-driven loadout generation over injected catalog,
  pricing, bag shape, weighting, and validation hooks.
- `artifact-capabilities`: default backpack family capability helpers plus
  override hooks for game-specific item families, bag/container semantics, and
  stat contribution checks.
- `artifact-visual-classification`: product-configurable role/shine/stat/
  footprint classification helpers and classifier factory over injected visual
  taxonomy, owner, and shape adapters. Product repos keep copy, prompts,
  visual labels, CSS taxonomy, and art assumptions local.
- `loadout-validation`: provider-driven flat-grid and bag-coverage validation
  over injected catalog, pricing, bag policy, and stat rules.
- `modules/loadout/validation-service`: provider-driven loadout validation
  service factory, plus a server module factory for app module lists.
- `battle-simulation`: deterministic 1v1 battle loop with injected combatant,
  ability, tiebreak, attribution, and narration hooks.
- `asset-gacha`: reusable asset acquisition and gacha pack policy helpers over
  injected catalogs, ownership snapshots, time, and RNG, including
  catalog-acquisition default/override resolution and roll/burn result DTO
  shaping plus roll/burn settlement planners.
- `modules/gacha/simulation-service`: provider-driven service factories for
  static/runtime pack odds simulation, plus a server module factory for app
  module lists.
- `modules/config`: provider-neutral runtime config validation result,
  assertion, and CLI summary line shapers over product-owned validation rules.
- `modules/auth`: provider-neutral auth user/session/logout response shapers
  over product-owned auth verification, sessions, and player rows.
- `wallet-accounting`: reusable profile-wallet delta validation, balance math,
  purchase grant/reversal mutation shaping, status classification, and
  settlement invariants over injected persistence snapshots, plus
  provider-neutral purchase intent, checkout, completion planners, and generic
  settlement input parsing/adapter registry helpers.
- `modules/support`: provider-neutral support lookup bundle and mutation result
  DTO shaping over product-owned query/mutation rows.
- `profile-asset-state`: reusable profile asset ownership/equipment row
  shaping, equip validation, purchase spend mutation shaping, purchase/equip
  result DTO shaping, grant summaries, and portrait variant/list projection over
  injected catalog/policy snapshots.
- `client-view-model`: browser-safe frontend view-model shapers such as flat
  loadout row projection, grid prop preparation, grid-cell classification,
  occupied-cell maps, board cell/piece/bag-slot rows,
  preferred/canonical artifact preview orientation,
  artifact tile display contracts,
  artifact stat summary and stat-row helpers, asset pack summary/label/card
  helpers, gacha odds table-section helpers, asset roll-result panel helpers,
  wallet
  purchase-surface/status helpers, asset roll-feedback/error-status helpers,
  headless wallet/asset-roll mutation view-state helpers, wallet bundle loading
  view states, wallet checkout next-action decisions, asset roll/burn mutation
  refresh decisions, run-shop response patch helpers, game-run response patch
  helpers, shop item row helpers, replay playback state and event-row helpers,
  gacha admin draft-diff table row
  shaping, and gacha admin checklist/validation/season-plan row shaping over
  product-provided copy and route adapters, plus gacha admin odds preview row
  shaping for rarity/item tables and row helpers for fixture import previews
  and roll simulations.
- `vue`: neutral Vue 3 component primitives backed by `client-view-model` DTOs.
  Components such as `ArtifactTile`, `AssetRollResultPanel`, `BackpackGrid`,
  `BattleLog`, `GachaOddsTable`, `GachaPackCard`, `GachaPackCardList`,
  `ShopItemList`, and `ShopItemRow` provide structural markup, neutral
  events/slots, and class hooks while product repos keep routes, copy, images,
  haptics, page layout, and final themes local. Browser-safe composables such
  as `createReducedMotionTracker` share neutral UI state helpers while product
  repos keep settings storage and CSS policy local.
- `modules/gacha/admin-validation`: backend-safe gacha admin release checklist,
  fixture normalization, fixture operation summary, season-plan projection,
  draft-diff, and promotion metadata helpers over product-provided rows.
- `client`: route-adapter HTTP client primitives for product-provided API
  routes, fetch implementation, auth headers, storage policy, and optional
  `{ success, data, error }` envelope unwrapping.
- `server`: product-neutral server module descriptors, dependency-checked
  module setup, auth/bootstrap route-group factories, moved server-file
  factories for ghost loadouts, loadout validation wrappers, gacha simulation
  wrappers, readiness singleton exports, reusable run readiness/lock helpers,
  neutral server utility helpers, adapter-driven structured/request logging,
  mutation-claim service factory, server module factories for shared services,
  and shared middleware.
  The module contract is documented in
  [`docs/server-module-contract.md`](docs/server-module-contract.md).
- `server/ports/mushroom/gameplay`: quarantined move-first ports for Mushroom
  gameplay service files that are not neutral yet. These exports are migration
  surfaces, not stable cross-game APIs; use them through product wrappers while
  repository/config contracts are extracted. Current ports include
  `createGameRunLoadoutPort()`, `createArtifactFusionPort()`,
  `createMushroomBattleEnginePort()`, `createMushroomBattleServicePort()`, and
  `createMushroomGameServicePort()`, `createMushroomPlayerServicePort()`,
  `createMushroomRunServicePort()`, `createMushroomShopServicePort()`, and
  `createSeasonProgressPort()`.
- `server/models/mushroom`: quarantined Mushroom Sequelize model definitions
  moved from `app/server/models`. Products still own the Sequelize instance,
  dialect config, sync/backfill logic, queries, transactions, and migrations.

## Stable Layered Exports

The package keeps the original root and direct helper subpaths for
compatibility, and now also exposes Geesome-inspired module paths:

- `@microwavedev/backpack-game-core/modules/gacha`
- `@microwavedev/backpack-game-core/modules/gacha/validation`
- `@microwavedev/backpack-game-core/modules/gacha/simulation`
- `@microwavedev/backpack-game-core/modules/gacha/simulation-service`
- `@microwavedev/backpack-game-core/modules/gacha/admin-validation`
- `@microwavedev/backpack-game-core/modules/wallet`
- `@microwavedev/backpack-game-core/modules/wallet/accounting`
- `@microwavedev/backpack-game-core/modules/wallet/settlement-adapters`
- `@microwavedev/backpack-game-core/modules/assets`
- `@microwavedev/backpack-game-core/modules/assets/profile-state`
- `@microwavedev/backpack-game-core/modules/shop`
- `@microwavedev/backpack-game-core/modules/run`
- `@microwavedev/backpack-game-core/modules/season`
- `@microwavedev/backpack-game-core/modules/loadout`
- `@microwavedev/backpack-game-core/modules/loadout/validation-service`
- `@microwavedev/backpack-game-core/modules/battle`
- `@microwavedev/backpack-game-core/modules/fusion`
- `@microwavedev/backpack-game-core/artifact-capabilities`
- `@microwavedev/backpack-game-core/client`
- `@microwavedev/backpack-game-core/client-view-model`
- `@microwavedev/backpack-game-core/server`
- `@microwavedev/backpack-game-core/server/middleware`
- `@microwavedev/backpack-game-core/vue`
- `@microwavedev/backpack-game-core/vue/components`
- `@microwavedev/backpack-game-core/vue/composables`

Quarantined migration subpaths are public only for wrapped product adoption
while they are being neutralized:

- `@microwavedev/backpack-game-core/server/ports/mushroom/gameplay`
- `@microwavedev/backpack-game-core/server/models/mushroom`

Consumers should import only the package root or these public subpaths. Do not
import `src/*` or nested submodule paths from game code.

## Usage

```js
import { getEffectiveShape, isCellInShape } from '@microwavedev/backpack-game-core';

const shape = getEffectiveShape({ width: 3, height: 2, shape: [[1, 1, 1], [0, 1, 0]] }, 1);
console.log(isCellInShape(shape, 0, 0));
```

```js
import { createLoadoutValidator } from '@microwavedev/backpack-game-core/modules/loadout';
import { validateAssetGachaPack } from '@microwavedev/backpack-game-core/modules/gacha';
```

## Type Declarations

The package ships `.d.ts` files for the root export and every subpath export.
The declarations intentionally model product data as generic/plain objects:
games own catalogs, persistence, payments, wallet state, and product policy,
while this package types the reusable mechanics and provider hooks.

## Version Notes

Until registry publishing starts, the package commit SHA is the release
identity. See [CHANGELOG.md](CHANGELOG.md) for the current integration baseline
and module history.
