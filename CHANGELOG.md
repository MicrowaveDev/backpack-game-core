# Changelog

## 0.1.0 - Runtime/API Baseline

`backpack-game-core` is still consumed from Git/submodule checkouts rather than
from a published registry package. Treat the commit SHA as the release identity
until package publishing starts.

### Post-baseline additions

- Added headless artifact stat-row DTO shaping to `client-view-model`, so
  product UIs can share stat key/label/value/sign rows while keeping visual
  classes, icons, copy, and component markup local.
- Added run lifecycle planners to `modules/run`, so product services can share
  run-start drafts, initial/next shop-state counters, starter loadout drafts,
  ghost budget math, round result counters/rewards, and challenge group
  completion decisions while keeping SQL, battle simulation, catalog lookup,
  fusions, rewards execution, rating, season, achievements, and route errors
  local.
- Added asset-gacha roll and duplicate-burn settlement planners to
  `modules/gacha`, so product services can share candidate/result metadata,
  wallet spend payloads, grant drafts, evidence rows, burn-source metadata, and
  result item DTOs while keeping secure RNG, idempotency, SQL transactions,
  wallet debit execution, and audit records local.
- Added wallet purchase intent, checkout metadata, and completion grant
  planners to `modules/wallet`, so product services can share provider-neutral
  intent drafts, checkout DTOs, checkout metadata patches, price checks, and
  completed-intent grant mutations while keeping provider SDK calls, webhooks,
  locks, SQL rows, and operations runbooks local.
- Added run-shop lifecycle planners to `modules/shop`, so product services can
  share buy/refresh/sell coin deltas, offer transitions, refresh counters, and
  sell refund calculations while keeping run locks, loadout rows, artifacts,
  product catalog policy, and persistence local.
- Added gacha admin fixture-operation and simulation-item row helpers to
  `client-view-model`, so admin panels can share row limiting and fallback
  display fields for import previews and roll simulations.
- Added gacha admin odds preview row helpers to `client-view-model`, so admin
  panels can share rarity/item row shaping, expected-percent text, and fallback
  display fields while keeping preview loading, product copy, and page layout
  local.
- Added gacha admin fixture operation summary helpers to
  `modules/gacha/admin-validation`, so product admin services can share dry-run
  import summaries while keeping DB transactions, audit logs, permissions, and
  route payloads local.
- Added gacha admin validation/checklist/season-plan row helpers to
  `client-view-model`, so product admin panels can share issue rows, release
  rows, plan coverage rows, total weight, and chance text while keeping API
  calls, product copy, image upload, and page layout local.
- Added gacha admin pack snapshot/live-draft diff helpers to
  `modules/gacha/admin-validation` and draft-diff table row shaping to
  `client-view-model`, so product admin panels can share pure diff DTOs while
  keeping DB reads, auth, audit logs, upload/storage, and UI chrome local.
- Added replay playback state helpers to `client-view-model`, so product
  composables can share speed selection, long-battle boost, autoplay delay,
  tick advancement, load/set-speed patches, and timeline shaping while keeping
  timers, routes, settings persistence, event formatting, navigation, and UI
  local.
- Added game-run response patch helpers to `client-view-model`, so product
  composables can share start/ready/round-transition/completion state
  projection while keeping routes, replay loading, navigation, haptics, and
  bootstrap side effects local.
- Added run-shop response patch helpers to `client-view-model`, so product
  composables can share buy/sell/refresh state projection while keeping API
  calls, haptics, and artifact catalogs local.
- Added headless wallet/gacha state helpers to `client-view-model` for wallet
  bundle loading, wallet checkout next-action decisions, and asset roll/burn
  mutation refresh decisions while games keep API calls and checkout side
  effects local.
- Added profile asset record, instance/equipment summary, purchase result,
  equip result, and grant summary DTO shapers to `profile-asset-state` /
  `modules/assets`, so games can share inventory response contracts while
  keeping persistence and catalogs local.
- Added optional `{ success, data, error }` response-envelope unwrapping to the
  route-adapter `client`, so product apps can adopt the shared client without
  changing existing backend payload contracts.
- Added headless wallet purchase and asset roll mutation view-state helpers to
  `client-view-model`, so product composables can share opening/success/failure
  state transitions while keeping API routes, checkout opening, refresh hooks,
  and product copy local.
- Added profile asset target-variant list shaping to `profile-asset-state` /
  `modules/assets`, so games can share inventory/equipment response projection
  while injecting product asset-id and acquisition-policy adapters.
- Added asset gacha roll and duplicate-burn result DTO shapers to
  `asset-gacha` / `modules/gacha`, including persisted row normalizers for
  replay-safe consumer payloads.
- Added wallet intent, Telegram invoice, and asset-roll error status
  normalization helpers to `client-view-model`, so product UIs can reuse one
  status contract while keeping provider routes and copy local.
- Added artifact grid utility helpers to `client-view-model`: occupied-cell
  value maps, placement-preferred orientation, and canonical preview
  orientation for rectangular and shape-bearing artifacts.
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
