# Changelog

## Unreleased

- Add a product-neutral production container update runner for Docker Compose
  rebuild/restart, cache cleanup, diagnostics, and HTTP health waiting. Consumer
  wrappers retain Git/submodule bootstrap, topology, credentials, and product
  defaults.
- Add stable browser-safe `modules/telegram` and Node-only `server/telegram`
  facades for Mini App links, keyboards, update normalization, init-data
  verification, Bot API transport, update routing, and reusable bot runtime.
  Keep credentials, commands, copy, webhook mounting, and product callbacks in
  consumers, with the former Mushroom port retained as a compatibility export.
- Add the repository-targeted `backpack-game-core` tooling CLI, require an
  explicit `--repo-root`, and document CLI, configured-wrapper, and
  product-only script routing.
- Organize flat root mechanics into domain, client, and shared folders while
  preserving compatibility exports and documenting architecture routing.
- Add structured indexed-animation preparation with configurable naming,
  fallback detection, frame-count checks, composition, and output validation.
- Add neutral normalized crop, resize dispatch, dimension-only frame-grid,
  raster-detail normalization, frame clustering, and mask-boundary metrics.
- Add MIME-aware image file data URLs for shared review tooling.
- Let frame-grid composition forward byte-preserving raster composite modes.
- Add indexed frame-file discovery and PNG frame-grid composition tooling.

## 0.1.0 - Runtime/API Baseline

`backpack-game-core` is still consumed from Git/submodule checkouts rather than
from a published registry package. Treat the commit SHA as the release identity
until package publishing starts.

### Post-baseline additions

- Added residual review-tooling primitives for contain placement,
  remainder-aware grids, alpha diagnostics/fitting, neutral RGB and edge
  transforms, binary-mask connected components, configurable palette
  histograms/swatches, opaque-matte metrics, atomic JSON records, and
  manifest-only evidence. Product layouts, thresholds, art direction, and
  workflow state remain consumer-owned.

- Added product-neutral raster transforms, spritesheet/frame-grid helpers,
  pixel-analysis metrics, and atomic hash-bound review evidence. Raster APIs
  expose explicit resize and compositing modes so consumer review outputs can
  migrate without changing their PNG bytes; products retain layouts, colors,
  paths, art-direction thresholds, and approval policy.

- Added product-neutral image review, image validation, work queue, release
  sequence, vertical PNG stitching, and fusion catalog validation contracts.
  Browser libraries, paths, content policy, prompts, and command lists remain
  injected by consumers.

- Added Node-only `tooling/image`, `tooling/provenance`, `tooling/commands`, and
  `tooling/runners` exports after physically moving the reusable Mushroom script
  engines. Repository roots, command manifests, browser suite maps, product
  asset catalogs, and process policy are injected by consumer wrappers.

- Added persistence-neutral `run-runtime/v1` orchestration through
  `createRunRuntimeService()`. Products inject one atomic adapter per run
  operation and retain transactions, repositories, rewards, events, policy,
  HTTP mapping, and product-specific challenge/readiness behavior.
- Added the neutral Vue `RunSummaryScreen`. It renders locale-ready character,
  outcome, stat, and round DTOs and emits only `home` and `open-round`; product
  adapters own vocabulary, routes, assets, state lookup, and final CSS.
- Added framework-neutral profile, wallet, asset, social, run, support-admin,
  and gacha-admin route-group factories. The gacha contract distinguishes bulk
  pack-item replacement (`PUT`) from single-item creation (`POST`), fixing an
  unreachable duplicate `PUT` registration in the original consumer routes.
  Consumers inject handlers and policy middleware while core owns stable route
  names, default paths, access metadata, and descriptor assembly. Route
  middleware is de-duplicated when a route key is also its access-policy key,
  preventing repeated rate limits or idempotency guards.
- Added framework-neutral `createBotRouteGroup()` and `createWikiRouteGroup()`
  descriptor factories. Consumers inject handlers and access middleware while
  core owns route names, default paths, feature metadata, and group assembly.
- Added `createWikiServicePort()` in the platform package after physically
  moving frontmatter parsing, Markdown block shaping, section indexes, related
  entry resolution, and progression-tier gating behind injected filesystem,
  path, Markdown, section, threshold, and summary-field providers.
- Added `createTelegramBotGatewayPort()` in the quarantined platform package
  after physically moving Mini App/deep-link helpers, Bot API transport,
  webhook reconciliation, game callbacks/scores, auth-code flow, payment
  callbacks, command handling, and mention replies behind injected auth,
  wallet, environment, fetch, product-name, and copy providers.
- Added `createMushroomAuthServicePort()` in the quarantined Mushroom platform
  port package after physically moving session login/logout, provider init-data
  verification, browser auth codes, player-default initialization, auth pruning,
  and request authentication behind injected DB/transaction, character catalog,
  crypto, clock, randomness, ID, language, and session-policy providers.
  Mushroom keeps credentials, environment policy, route registration, and the
  concrete legacy table contract in its local adapter.
- Added `createMushroomProviderSettlementServicePort()` and
  `createMushroomWalletOpsCheckServicePort()` after physically moving external
  settlement reconciliation/import and wallet operational reporting behind
  injected persistence, provider policy, wallet audits, clock/ID/JSON, env,
  and fetch providers. Concrete provider export field maps and alert
  configuration remain product-owned.
- Added `createMushroomSupportMoneyServicePort()` and
  `createMushroomSupportOpsServicePort()` after physically moving Mushroom's
  support lookup, wallet adjustment, asset grant/revoke/freeze/unfreeze,
  purchase refund, and action-list behavior behind injected persistence,
  wallet, asset, audit, ID, clock, and JSON providers. Mushroom keeps operator
  tokens, role/approval policy, routes, and concrete audit writes local.
- Added `createMushroomGachaAdminServicePort()` to the quarantined Mushroom
  economy port package after physically moving season, collection, pack,
  plan-item, fixture import/export, promotion, simulation, release-checklist,
  and audit orchestration behind injected persistence, character catalog,
  asset service, wallet currency, clock/ID/JSON, env, and image-storage
  providers. Mushroom keeps its filesystem paths, public asset directory,
  permissions, routes, and product configuration in a thin local wrapper.
- Added `createMushroomAssetServicePort()` to the quarantined Mushroom
  economy port package after physically moving Mushroom's profile asset
  catalog, direct purchase, equipment, runtime pack, gacha roll, duplicate
  burn, pity, and pack-odds behavior behind injected DB, transaction, portrait
  catalog, wallet, mutation-claim, ID, clock, JSON, and env providers.
  Mushroom keeps the old asset-service path as a wrapper while asset/gacha
  repository and policy contracts are neutralized.
- Added `createMushroomWalletServicePort()` to the quarantined Mushroom
  economy port package after physically moving Mushroom's wallet balance,
  wallet transaction, purchase-intent, Telegram Stars, BTCPay, NOWPayments,
  webhook replay, settlement reconciliation, stale-intent expiry, and mirror
  audit behavior behind injected DB, transaction, ID, clock, JSON, env, and
  fetch providers. Mushroom keeps the old wallet-service path as a wrapper
  while repository, provider, and paid-ops contracts are neutralized.
- Added `createMushroomRunServicePort()` to the quarantined Mushroom gameplay
  port package after physically moving Mushroom's run lifecycle service behind
  injected DB, transaction, lock, battle, shop, loadout, fusion, season,
  wallet, asset, ghost, rating, clock, RNG, catalog, and pruning providers.
  Mushroom keeps the old run-service path as a wrapper and re-export facade for
  shop mutations while repository and route contracts are neutralized.
- Added `createMushroomPlayerServicePort()` to the quarantined Mushroom
  gameplay port package after physically moving Mushroom's profile, settings,
  friend/challenge, leaderboard, inventory-review, portrait, and preset service
  behavior behind injected DB, transaction, catalog, wallet, asset, season,
  clock, ID, bot-loadout, and run-challenge providers. Mushroom keeps the old
  service path as a wrapper while repository and route contracts are
  neutralized.
- Added `createMushroomGameServicePort()` to the quarantined Mushroom gameplay
  port package after physically moving Mushroom's bootstrap state assembly
  behind injected player, battle-history, run-history, active-run, asset-pack,
  asset-catalog, home-field, daily-limit, clock, and catalog providers.
  Mushroom keeps the old facade export path and product service composition,
  while the moved port preserves current bootstrap response aliases until
  repository and route contracts are neutral.
- Added `createMushroomShopServicePort()` to the quarantined Mushroom gameplay
  port package after physically moving Mushroom's run-shop buy, refresh,
  force-shop, sell, and eligible character-item lookup behavior behind injected
  transaction, lock, catalog, pricing, pity, progression, loadout-row, clock,
  RNG, and run-currency providers. It preserves current Mushroom run-shop SQL,
  error text, and compatibility response aliases until repository contracts
  replace the table details.
- Added `createMushroomBattleEnginePort()` and
  `createMushroomBattleServicePort()` to the quarantined Mushroom gameplay
  port package after physically moving Mushroom's battle hook, active snapshot,
  replay persistence, and battle history services behind injected catalog,
  RNG, validation, portrait, DB query, ID, and clock providers. These preserve
  current Mushroom ability names, artifact metadata, and SQL table behavior
  until repository/config contracts replace the product-specific details.
- Added `modules/season` with product-configurable season level/scoring
  helpers and run-achievement evaluator factories. Product repos keep season
  tables, achievement definitions, badge/rank art, copy, scheduling, and
  balance local.
- Added `createSeasonProgressPort()` to the quarantined Mushroom gameplay port
  package after physically moving Mushroom's season persistence service behind
  injected scoring, achievement, ID, and clock providers. It preserves current
  `player_season_*` / `player_achievements` SQL until repositories replace
  table details.
- Added `createMutationClaimService()` to the public `server` facade after
  physically moving Mushroom's mutation-claim helper into core and replacing
  product env/db imports with injected query, ID, clock, sleep, and timing
  adapters.
- Added `artifact-fusion-recipes` and expanded `modules/fusion` with
  product-configurable recipe normalization, recipe lookup, ingredient-policy,
  and fusion evaluator helpers. Product repos keep authored recipe tables,
  artifact ids, unlock/balance policy, and catalog ownership local.
- Added `artifact-visual-classification`, a product-configurable artifact
  visual taxonomy engine moved from Mushroom's `app/shared` layer. Core now
  owns role/shine/stat/footprint classification helpers and a classifier
  factory over injected role classes, shine tiers, owner adapters, and shape
  hooks, while products keep visual labels, prompts, CSS taxonomy, art
  assumptions, and legacy owner fields local.
- Moved Mushroom's full Sequelize model definition set from
  `app/server/models` into the quarantined `server/models/mushroom` package
  subpath. Mushroom now keeps only a local `models/index.js` wrapper, while
  product repos still own Sequelize instances, dialect config, sync/backfill
  logic, queries, transactions, and migrations.
- Added the second quarantined gameplay port at
  `server/ports/mushroom/gameplay`: `artifact-fusion-service.js` was
  physically moved from Mushroom and wrapped as `createArtifactFusionPort()`
  over injected DB query, catalog, fusion matcher, loadout row mutation, clock,
  and ID providers. It preserves current `game_run_fusions` SQL until fusion
  repositories/config contracts replace table details.
- Added the first aggressive quarantined gameplay port at
  `server/ports/mushroom/gameplay`: `game-run-loadout.js` was physically moved
  from Mushroom and wrapped as `createGameRunLoadoutPort()` over injected DB,
  catalog, grid, validation, clock, and ID providers. This is intentionally
  not a stable neutral module yet; the explicit import-boundary allowlist must
  shrink as repository contracts replace table/query details.
- Moved the second small server-file cluster into the `server` facade:
  neutral time/id/JSON/language/RNG/progression/currency helpers plus
  adapter-driven structured logging and request logging. Product repos keep
  legacy naming aliases and product-specific log context locally.
- Moved the first server-file cluster into core-backed factories:
  `createGhostLoadoutService`, `createServerLoadoutUtils`,
  `createServerGachaSimulationService`, and `createReadyManagerExports`.
  Product repos now wire catalogs, characters, validation, pack providers,
  readiness config, image paths, and legacy aliases locally.
- Added provider-neutral auth/bootstrap route-group and server-module factories
  under `server`, so apps can share auth route shape while keeping provider
  verification, sessions, player lookup, middleware policy, and final paths
  local.
- Added provider-neutral auth user/session/logout response shapers under
  `modules/auth`, so apps can share login payload envelopes while keeping
  auth verification, session storage, and player lookup local.
- Hardened `client` error-message extraction so shared route clients preserve
  API errors shaped as either strings or `{ message }` objects.
- Added provider-neutral runtime config validation result, assertion, and CLI
  summary line shapers under `modules/config`, so apps can share deploy-check
  response formatting while keeping environment policy local.
- Added provider-neutral support lookup bundle and support mutation result DTO
  shaping under `modules/support`, so apps can share support/admin response
  envelopes while keeping permissions, audit persistence, and mutations local.
- Added provider-driven run-state summary DTO shaping to `modules/run`, so
  product services can share active-run response assembly while keeping loadout
  totals, shop row formatting, battle execution, persistence, and routes local.
- Added provider-neutral settlement input adapter registry helpers under
  `modules/wallet/settlement-adapters`, so apps can share CSV/JSON parsing,
  scoped field lookup, and record mapping while keeping provider-specific field
  maps, credentials, callbacks, reconciliation storage, and ops runbooks local.
- Added `createRunReadinessServerModule`, so apps can register the shared
  readiness/idle/lock manager through module lists while keeping route wiring,
  active-run checks, challenge resolution, and SSE delivery local.
- Added provider-driven loadout validation service and
  `createLoadoutValidationServerModule`, so apps can register validation
  through module lists while keeping grid constants, artifact lookup, prices,
  family semantics, and stat caps local.
- Added provider-driven gacha simulation service factories and
  `createAssetGachaSimulationServerModule`, so apps can register static/runtime
  pack odds simulation through core module lists while keeping DB/catalog/pack
  lookup and admin visibility policy local.
- Added `artifact-capabilities` and included it in `modules/loadout`, so games
  can share backpack family capability defaults, configurable bag-family
  detection, combat/stat contribution checks, and container-placement rules
  while keeping catalog taxonomy and item definitions local.
- Added optional Vue 3 component subpaths (`./vue` and `./vue/components`)
  with neutral `ArtifactTile`, `AssetRollResultPanel`, `BackpackGrid`,
  `BattleLog`, `GachaOddsTable`, `GachaPackCard`, `GachaPackCardList`,
  `ShopItemList`, and `ShopItemRow` primitives backed by existing DTO shapers,
  plus a frontend contract doc and import-boundary tests to keep product
  routes, assets, provider code, and server-only imports out of core frontend
  exports.
- Added headless artifact tile display contracts to `client-view-model`, so
  product UIs can share tile dimensions, mask cells, role/shine class metadata,
  image fallback, rotated-image hints, and role glyph labels while keeping
  artwork, CSS, generated SVGs, and product visual classifiers local.
- Added headless asset pack card row shaping to `client-view-model`, so product
  UIs can share pack detail/status lines and roll/burn action DTOs while
  keeping translated templates, event handlers, markup, and styling local.
- Added headless gacha odds table section and asset roll result panel shaping
  to `client-view-model`, so product UIs can share table metadata and roll
  feedback panel DTOs while keeping markup, theme, localization, and route
  behavior local.
- Added headless grid board render DTO shaping to `client-view-model`, so
  product UIs can share board cell flags, placed-piece grid positions, and
  bag-slot rows while keeping component markup, CSS classes, image paths,
  drag/drop behavior, and product styling local.
- Added headless replay event row shaping to `client-view-model`, so product
  UIs can share battle-log filtering, active-row flags, row ordering, text
  fallback, and row limiting while keeping narration copy, replay screen markup,
  routes, and persistence local.
- Added headless shop item row DTO shaping to `client-view-model`, so product
  UIs can share offer lookup, price, affordability, preview footprint,
  bag/character flags, and stat rows while keeping localized copy, shop markup,
  roles, fusion hints, actions, and styles local.
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
