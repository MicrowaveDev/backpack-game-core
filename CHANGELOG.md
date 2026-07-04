# Changelog

## 0.1.0 - Runtime/API Baseline

`backpack-game-core` is still consumed from Git/submodule checkouts rather than
from a published registry package. Treat the commit SHA as the release identity
until package publishing starts.

### Post-baseline additions

- Added artifact stat client view-model helpers to `client-view-model`: stat
  total summing, signed delta formatting, bonus-entry DTO shaping, and loadout
  stat text composition over product-provided labels/stat order/suffixes.
- Added asset pack client view-model helpers to `client-view-model`: rarity
  odds text, guarantee/pity/duplicate copy text, availability labels, active
  checks, and roll-pack summaries over product-provided labels.
- Added wallet purchase-surface and asset roll-feedback view-model helpers to
  `client-view-model`, so games can share wallet bundle/status/support shaping
  and roll result/problem copy assembly while keeping labels and routes local.
- Added grid-cell classification helpers to `client-view-model`, including
  slot-first bag row lookup and occupied-footprint key generation for shared
  backpack board rendering.
- Added asset catalog acquisition-policy resolution to `asset-gacha` /
  `modules/gacha`, so games can share paid/free default mode and per-asset
  override handling while keeping env parsing and product catalog assembly
  local.
- Added `profile-asset-state` and `modules/assets`: pure profile asset helpers
  for ownership/equipment row shaping, equip validation, purchase spend
  mutation shaping, asset instance drafts, and portrait variant projection.
  Product games still own runtime catalogs, SQL row lifecycle, support
  grant/revoke/restore actions, paid rollback behavior, and compatibility
  mirrors.
- Added `wallet-accounting` and `modules/wallet`: pure profile-wallet helpers
  for delta validation, balance math, purchase grant/reversal mutation shaping,
  purchase status classification, and settlement invariants. Product games
  still own balance rows, transaction inserts, idempotency locks, mirrors,
  provider callbacks, support actions, and reconciliation queries.
- Added `modules/gacha/simulation`: deterministic gacha odds simulation over
  injected packs, catalogs, ownership snapshots, copy counts, pity state, seed,
  and RNG. Product games still own static/runtime pack lookup and catalog
  visibility policy, while admin previews, CLI tools, and tests can share one
  roll simulation model.
- Added `modules/gacha/admin-validation`: pure gacha admin helpers for release
  checklist evaluation, fixture normalization, plan-item generated asset-id
  invariants, season-plan catalog projection, promotion metadata shaping, and
  plan coverage summaries. Product games still own DB transactions, audit logs,
  admin permissions, uploads, storage, route payloads, and product error
  handling.
- Added Geesome-inspired public layer exports:
  `modules/gacha`, `modules/gacha/validation`, `modules/shop`,
  `modules/loadout`, `modules/battle`, `modules/fusion`, `client`, and
  `client-view-model`. These are additive facades over existing helpers plus a
  route-adapter client and frontend loadout projection helpers, so consumers can
  move off flat helper imports without deep-importing package internals.
- Added `asset-gacha`: reusable asset acquisition and gacha pack policy helpers
  over injected catalogs, ownership snapshots, time, and RNG. The module covers
  pack validation, acquisition policy, candidate filtering, weighted roll
  selection, guarantees, pity, duplicate copy caps, burn target selection, pack
  UI shaping, and TypeScript declarations.

### Runtime/API baseline

`d5fb481` is the first typed runtime/API baseline. Later documentation-only
commits may be consumed by game submodule pointers without changing the exported
runtime mechanics.

- `d5fb481` - Add TypeScript declarations for the root export and every subpath
  export, plus package export metadata.
- `13e6e0c` - Add reusable numeric-seed RNG helpers, integer rolls, and seeded
  shuffle.
- `d884410` - Add provider-driven flat-grid and bag-aware loadout validation.
- `b9879bd` - Add hookable 1v1 battle simulation.
- `4056d7a` - Add provider-driven backpack loadout generation.
- `6be48a9` - Add deterministic shop offer generation.
- `fdbad4b` - Add adjacent fusion matching.
- `92a39d5` - Add grid footprint and cell-set helpers.
- `69666c8` - Add bag shape masks, rotation, dimensions, and shape-cell helpers.

### Package contract

- Runtime source is ESM JavaScript.
- Type declarations are shipped from `src/*.d.ts`.
- Product games own catalogs, persistence, payment/wallet state, asset
  ownership, UI, and game-specific policy.
- Core helpers stay pure and receive product data through plain objects and
  provider hooks.
