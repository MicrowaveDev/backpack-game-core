# Backpack Game Core Agent Guide

This repo contains reusable backpack-game mechanics consumed by Mushroom
Battles and Meat Master. Keep it product-neutral.

## Efficient Routing

- Read `docs/architecture-routing.md` before broad source searches or moving
  code. Use its domain table to open only the relevant folder first.
- Keep `src/` flat only for `index.js` and `index.d.ts`. Put implementations in
  `shared/`, `modules/`, `client/`, `vue/`, `server/`, or `tooling/` according
  to the routing document.
- Prefer an existing `src/modules/<domain>` over creating a new top-level
  concept. Combat artifacts belong to `modules/artifacts`; profile cosmetics
  belong to `modules/assets`.
- Consumers must use package exports. Core internals and core tests may use
  relative source imports; never teach a consumer to deep-import `src/*`.
- When physically reorganizing code, move files rather than recreating them,
  keep `.js` and `.d.ts` pairs together, preserve compatibility specifiers in
  `package.json`, and update the owning domain barrel.
- Search narrowly after routing, for example `rg <name> src/modules/gacha
  tests`, instead of scanning every server port, model, Vue component, and
  tooling engine.

## Core Boundary

- Do not import Mushroom or Meat code from core.
- Do not add product catalogs, art paths, copy, themes, product route maps,
  Telegram helpers, payment SDKs, support/admin policy, or provider
  credentials here.
- Do not add migrations, database clients, Postgres code, or SQLite code to
  core. Product repos own persistence, transactions, deployment, and repository
  implementations.
- The only current Sequelize exception is the quarantined legacy model
  definition package at `src/server/models/mushroom`. It is a migration surface
  for Mushroom table definitions, not a stable cross-game repository layer.
  Keep dialect setup, sync/backfill code, queries, transactions, and migrations
  in product repos.
- Core helpers should accept plain rows, snapshots, config objects, callbacks,
  or repository/service adapters from the consuming game.
- Core server modules may expose neutral route descriptors and route factories,
  but product repos own final route mounting, middleware order, auth
  attachment, static files, and provider/webhook routes.
- Browser-safe exports must avoid Node-only imports.

## Cross-Game Runtime Goals

Future Mushroom and Meat work should support two product-owned runtime modes:

- **Hosted server mode:** the game backend runs on a server with PostgreSQL in
  Docker as the authoritative shared/community store.
- **Local app mode:** the game runs as a packaged desktop/local app with SQLite
  as a local private store. The main server is only needed for community
  features such as leaderboard, friends/challenges, optional account linking,
  or shared seasons.

Core remains persistence-neutral for both modes. If a helper needs data access,
shape it around injected providers/adapters rather than a concrete database.
Do not make local-app progress authoritative for paid purchases, gacha seasons,
support/admin operations, marketplace/trading, or shared rankings unless the
consumer plan explicitly changes.

The canonical cross-game plan is maintained in the Mushroom consumer docs when
this repo is checked out under the hub:

- `mushroom-master/docs/profile-currency-and-core-extraction-plan.md`, section
  `P13.7A - Deployment Modes And Storage Direction`
- `mushroom-master/docs/game-core-runtime-contracts.md`

## Validation

- Run `npm test` after core behavior or export changes.
- Run `npm pack --dry-run` after adding exports or files that should ship.
- Keep package subpath exports and `.d.ts` declarations in sync.

## Node Tooling

- Reusable script engines live under the Node-only `tooling/*` exports. Keep
  repository roots, catalogs, command aliases, suite maps, environment policy,
  logging, and process exit policy in consumer wrappers.
- Do not re-export Node tooling from the package root, `client`, or `vue`.
- Product script entry points must import package subpaths, never core source
  paths. Browser tooling such as Puppeteer and Playwright remains a consumer
  dependency; core runner helpers only orchestrate injected commands.
