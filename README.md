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
- `shop-offer`: deterministic offer generation over injected item pools.
- `backpack-loadout`: provider-driven loadout generation over injected catalog,
  pricing, bag shape, weighting, and validation hooks.
- `loadout-validation`: provider-driven flat-grid and bag-coverage validation
  over injected catalog, pricing, bag policy, and stat rules.
- `battle-simulation`: deterministic 1v1 battle loop with injected combatant,
  ability, tiebreak, attribution, and narration hooks.

## Usage

```js
import { getEffectiveShape, isCellInShape } from '@microwavedev/backpack-game-core';

const shape = getEffectiveShape({ width: 3, height: 2, shape: [[1, 1, 1], [0, 1, 0]] }, 1);
console.log(isCellInShape(shape, 0, 0));
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
