# Architecture And Routing

This document is the source of truth for locating code, choosing imports, and
adding reusable behavior to Backpack Game Core.

## Source Layout

```text
src/
  index.js, index.d.ts     compatibility package barrel only
  shared/                  dependency-light primitives used by many domains
  modules/                 product-neutral gameplay and profile domains
  client/                  browser-safe HTTP and view-model contracts
  vue/                     neutral Vue components and composables
  server/                  server factories, middleware, and migration ports
  tooling/                 Node-only build, image, evidence, and runner tooling
```

`src/` must not accumulate feature implementations. Only the two package-root
barrels belong directly in it.

## Domain Routing

| Concern | Implementation location | Preferred public import |
| --- | --- | --- |
| Bag shapes, grid geometry, loadout generation and validation | `src/modules/loadout/` | `@microwavedev/backpack-game-core/modules/loadout` |
| Combat artifact capabilities and visual classification | `src/modules/artifacts/` | `@microwavedev/backpack-game-core/modules/artifacts` |
| Fusion matching and recipe evaluation | `src/modules/fusion/` | `@microwavedev/backpack-game-core/modules/fusion` |
| Shop offers and run-shop state planners | `src/modules/shop/` | `@microwavedev/backpack-game-core/modules/shop` |
| Run lifecycle and persistence-neutral runtime coordination | `src/modules/run/` | `@microwavedev/backpack-game-core/modules/run` |
| Battle simulation | `src/modules/battle/` | `@microwavedev/backpack-game-core/modules/battle` |
| Gacha selection, validation, simulation, and admin planning | `src/modules/gacha/` | `@microwavedev/backpack-game-core/modules/gacha` |
| Wallet accounting and settlement planning | `src/modules/wallet/` | `@microwavedev/backpack-game-core/modules/wallet` |
| Profile-owned assets and equipment state | `src/modules/assets/` | `@microwavedev/backpack-game-core/modules/assets` |
| Browser-safe Telegram links, keyboards, commands, update normalization, and score payloads | `src/modules/telegram/` | `@microwavedev/backpack-game-core/modules/telegram` |
| Auth, config, season, support, community, and social-preview contracts | Matching `src/modules/<domain>/` | Matching `.../modules/<domain>` export |
| Shared deterministic RNG | `src/shared/` | Package root or compatibility `.../rng` export |
| Browser-safe request adapters and view-model DTOs | `src/client/` | `.../client` or `.../client-view-model` |
| Browser-safe application adapter, service-port, and normalized-error contracts | `src/client/application/` | `.../client/application` |
| Neutral Vue application shell and screen registry | `src/vue/app/` | `.../vue/app` |
| Neutral Vue pages, components, and composables | Matching folder under `src/vue/` | `.../vue/pages`, `.../vue/components`, or `.../vue/composables` |
| Server module factories and middleware | `src/server/` | `.../server` or `.../server/middleware` |
| Node-only Telegram init-data verification, Bot API transport, update routing, and reusable bot runtime | `src/server/telegram/` | `.../server/telegram` |
| Node-only scripts and image/release utilities | `src/tooling/` | Matching `.../tooling/<name>` export; route execution through [`tooling-routing.md`](tooling-routing.md) |

Artifacts are combat/loadout items. Assets are profile-owned cosmetics or
other collectible inventory. Keep that naming distinction when routing code.

## Import Rules

1. Consumers import package exports only. They must never import `src/*` or a
   nested submodule filesystem path.
2. Prefer domain facades (`modules/loadout`, `modules/gacha`, and so on) for new
   consumer code. The root barrel and direct helper subpaths remain supported
   for compatibility.
3. Core files use relative imports to the owning implementation. Do not make
   core internals import the package by its own package name.
4. Browser-safe code in `client/`, `vue/`, and gameplay modules must not import
   Node-only `tooling/` or concrete server code.
5. `server/` may depend on shared primitives and product-neutral modules.
   Modules must not depend on `server/`.
6. `tooling/` stays Node-only and does not leak through the root, client, or Vue
   barrels.

Executable tooling has an additional ownership and invocation contract in
[`tooling-routing.md`](tooling-routing.md). In particular, consumer-targeted
core commands require an explicit repository root.

## Public API Versus Files

`package.json` is the public import map. A physical file move is not a breaking
change when every existing export specifier still resolves to the same API.
When moving or adding an exported implementation:

1. Move the `.js` and `.d.ts` files together.
2. Update internal relative imports and the owning domain `index` barrel.
3. Retarget existing `package.json` exports instead of deleting compatibility
   specifiers.
4. Add a domain export when the domain has no public facade yet.
5. Update `src/index.js` and `src/index.d.ts` only when the root API changes.
6. Run `npm test` and `npm pack --dry-run`, then run the two-consumer gate from
   the hub after publishing and pinning the core commit.

## Product Boundary

Core owns deterministic mechanics, DTO shaping, validation engines, and
adapter-driven orchestration. Mushroom and Meat own catalogs, copy, routes,
credentials, environment policy, persistence implementations, migrations,
transactions, visual themes, and deployment topology. Quarantined Mushroom
server ports and models are migration surfaces, not templates for new neutral
modules.

Telegram follows the same adapter boundary. Core owns provider-protocol
normalization, signature verification, transport retries, neutral update
routing, and callback orchestration. Each game owns its bot identity, secrets,
public Mini App URL, commands, response copy, webhook mounting, payment policy,
and product services. Browser code imports `modules/telegram`; server code may
import `server/telegram`.

Shared social and catalog pages follow the same boundary: `vue/pages` owns
stable DOM and neutral events, while consumers inject localized labels,
catalog components, profile DTOs, invite-link construction, clipboard access,
and provider-specific sharing.
