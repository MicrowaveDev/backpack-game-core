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
- `fusion-matching`: pure adjacent-ingredient matching with product policy
  hooks.
- `shop-offer`: deterministic offer generation over injected item pools.
- `backpack-loadout`: provider-driven loadout generation over injected catalog,
  pricing, bag shape, weighting, and validation hooks.

## Usage

```js
import { getEffectiveShape, isCellInShape } from '@microwavedev/backpack-game-core';

const shape = getEffectiveShape({ width: 3, height: 2, shape: [[1, 1, 1], [0, 1, 0]] }, 1);
console.log(isCellInShape(shape, 0, 0));
```
