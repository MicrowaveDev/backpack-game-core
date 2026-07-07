# Backpack Game Core Agent Guide

This repo contains reusable backpack-game mechanics consumed by Mushroom
Battles and Meat Master. Keep it product-neutral.

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
