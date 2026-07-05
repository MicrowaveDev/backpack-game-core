# Backpack Game Core

Reusable pure mechanics for backpack/grid games.

This package intentionally contains no database, HTTP, payment, catalog, UI, or
product-lore code. Product games should pass plain data objects into these
helpers and keep persistence, asset ownership, wallet state, and game-specific
catalogs in their own repos.

## Current Modules

- `bag-shape`: shape masks, quarter-turn rotation, effective dimensions, and
  shape-cell checks for irregular bags.
- `grid-geometry`: serialized grid cells, footprint expansion, and set
  intersection helpers.
- `rng`: browser-safe deterministic numeric-seed RNG, integer rolls, and
  non-mutating seeded shuffle helpers.
- `fusion-matching`: pure adjacent-ingredient matching with product policy
  hooks.
- `shop-offer`: deterministic offer generation over injected item pools, plus
  run-shop buy/refresh/sell state planners over injected offer/currency
  snapshots.
- `run-lifecycle`: run start, initial/next shop state, starter loadout, ghost
  budget, round result, and group-completion planners over injected config and
  state snapshots.
- `backpack-loadout`: provider-driven loadout generation over injected catalog,
  pricing, bag shape, weighting, and validation hooks.
- `loadout-validation`: provider-driven flat-grid and bag-coverage validation
  over injected catalog, pricing, bag policy, and stat rules.
- `battle-simulation`: deterministic 1v1 battle loop with injected combatant,
  ability, tiebreak, attribution, and narration hooks.
- `asset-gacha`: reusable asset acquisition and gacha pack policy helpers over
  injected catalogs, ownership snapshots, time, and RNG, including
  catalog-acquisition default/override resolution and roll/burn result DTO
  shaping plus roll/burn settlement planners.
- `wallet-accounting`: reusable profile-wallet delta validation, balance math,
  purchase grant/reversal mutation shaping, status classification, and
  settlement invariants over injected persistence snapshots, plus
  provider-neutral purchase intent, checkout, and completion planners.
- `profile-asset-state`: reusable profile asset ownership/equipment row
  shaping, equip validation, purchase spend mutation shaping, purchase/equip
  result DTO shaping, grant summaries, and portrait variant/list projection over
  injected catalog/policy snapshots.
- `client-view-model`: browser-safe frontend view-model shapers such as flat
  loadout row projection, grid prop preparation, grid-cell classification,
  occupied-cell maps, preferred/canonical artifact preview orientation,
  artifact stat summary and stat-row helpers, asset pack summary/label helpers, wallet
  purchase-surface/status helpers, asset roll-feedback/error-status helpers,
  headless wallet/asset-roll mutation view-state helpers, wallet bundle loading
  view states, wallet checkout next-action decisions, asset roll/burn mutation
  refresh decisions, run-shop response patch helpers, game-run response patch
  helpers, replay playback state helpers, gacha admin draft-diff table row
  shaping, and gacha admin checklist/validation/season-plan row shaping over
  product-provided copy and route adapters, plus gacha admin odds preview row
  shaping for rarity/item tables and row helpers for fixture import previews
  and roll simulations.
- `modules/gacha/admin-validation`: backend-safe gacha admin release checklist,
  fixture normalization, fixture operation summary, season-plan projection,
  draft-diff, and promotion metadata helpers over product-provided rows.
- `client`: route-adapter HTTP client primitives for product-provided API
  routes, fetch implementation, auth headers, storage policy, and optional
  `{ success, data, error }` envelope unwrapping.

## Stable Layered Exports

The package keeps the original root and direct helper subpaths for
compatibility, and now also exposes Geesome-inspired module paths:

- `@microwavedev/backpack-game-core/modules/gacha`
- `@microwavedev/backpack-game-core/modules/gacha/validation`
- `@microwavedev/backpack-game-core/modules/wallet`
- `@microwavedev/backpack-game-core/modules/wallet/accounting`
- `@microwavedev/backpack-game-core/modules/assets`
- `@microwavedev/backpack-game-core/modules/assets/profile-state`
- `@microwavedev/backpack-game-core/modules/shop`
- `@microwavedev/backpack-game-core/modules/run`
- `@microwavedev/backpack-game-core/modules/loadout`
- `@microwavedev/backpack-game-core/modules/battle`
- `@microwavedev/backpack-game-core/modules/fusion`
- `@microwavedev/backpack-game-core/client`
- `@microwavedev/backpack-game-core/client-view-model`

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
