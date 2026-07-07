import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameRunLoadoutPort } from '@microwavedev/backpack-game-core/server/ports/mushroom/gameplay';

function rectangleCells(item) {
  const cells = [];
  for (let y = 0; y < Number(item.height || 1); y += 1) {
    for (let x = 0; x < Number(item.width || 1); x += 1) {
      cells.push(`${Number(item.x || 0) + x}:${Number(item.y || 0) + y}`);
    }
  }
  return cells;
}

function createPort({ query }) {
  const artifacts = new Map([
    ['bag', { id: 'bag', family: 'bag', width: 2, height: 2 }],
    ['blade', { id: 'blade', family: 'damage', width: 1, height: 1 }]
  ]);
  let nextId = 0;
  return createGameRunLoadoutPort({
    query,
    bagColumns: 4,
    getArtifactById: (artifactId) => artifacts.get(artifactId),
    createId: (prefix) => `${prefix}_${++nextId}`,
    nowIso: () => '2026-07-07T00:00:00.000Z',
    getEffectiveShape: (artifact) => Array.from({ length: artifact.height }, () => Array.from({ length: artifact.width }, () => 1)),
    normalizeRotation: (value) => Number(value || 0) % 4,
    effectiveGridHeight: () => 4,
    pieceCells: rectangleCells,
    validateBagPlacement: () => undefined,
    validateGridItems: () => undefined,
    validateItemCoverage: () => undefined,
    isBag: (artifact) => artifact?.family === 'bag'
  });
}

test('[server-port][mushroom gameplay] requires injected providers', () => {
  assert.throws(
    () => createGameRunLoadoutPort({}),
    /requires query/
  );
});

test('[server-port][mushroom gameplay] inserts loadout rows through injected query', async () => {
  const calls = [];
  const port = createPort({
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [], rowCount: 1 };
    }
  });

  const rowId = await port.insertLoadoutItem(null, {
    gameRunId: 'run_1',
    playerId: 'player_1',
    roundNumber: 1,
    artifactId: 'bag',
    x: 2,
    y: 1,
    active: false,
    freshPurchase: true
  });

  assert.equal(rowId, 'grlitem_1');
  assert.match(calls[0].sql, /INSERT INTO game_run_loadout_items/);
  assert.equal(calls[0].params[0], 'grlitem_1');
  assert.equal(calls[0].params[5], -1);
  assert.equal(calls[0].params[6], -1);
  assert.equal(calls[0].params[12], 0);
  assert.equal(calls[0].params[13], 0);
});

test('[server-port][mushroom gameplay] maps current round rows from injected repository shape', async () => {
  const port = createPort({
    query: async () => ({
      rowCount: 1,
      rows: [{
        id: 'row_1',
        artifact_id: 'blade',
        x: 0,
        y: 1,
        width: 1,
        height: 1,
        sort_order: 2,
        purchased_round: 1,
        fresh_purchase: 0,
        active: 0,
        rotated: 0
      }]
    })
  });

  assert.deepEqual(await port.readCurrentRoundItems(null, 'run_1', 'player_1', 1), [{
    id: 'row_1',
    artifactId: 'blade',
    x: 0,
    y: 1,
    width: 1,
    height: 1,
    sortOrder: 2,
    purchasedRound: 1,
    freshPurchase: false,
    active: false,
    rotated: 0
  }]);
});

test('[server-port][mushroom gameplay] prefers transaction client queries when provided', async () => {
  const directCalls = [];
  const clientCalls = [];
  const port = createPort({
    query: async (sql, params) => {
      directCalls.push({ sql, params });
      return { rows: [{ max_sort: 0 }], rowCount: 1 };
    }
  });

  const next = await port.nextSortOrder({
    query: async (sql, params) => {
      clientCalls.push({ sql, params });
      return { rows: [{ max_sort: 4 }], rowCount: 1 };
    }
  }, 'run_1', 'player_1', 2);

  assert.equal(next, 5);
  assert.equal(directCalls.length, 0);
  assert.equal(clientCalls.length, 1);
  assert.match(clientCalls[0].sql, /MAX\(sort_order\)/);
});
