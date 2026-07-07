import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createArtifactFusionPort,
  createGameRunLoadoutPort
} from '@microwavedev/backpack-game-core/server/ports/mushroom/gameplay';

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

test('[server-port][mushroom gameplay] applies artifact fusions through injected loadout providers', async () => {
  const calls = [];
  const artifacts = new Map([
    ['blade', { id: 'blade', width: 1, height: 1 }],
    ['knot', { id: 'knot', width: 1, height: 1 }],
    ['fused', { id: 'fused', width: 2, height: 1 }]
  ]);
  const rows = [
    { id: 'row_blade', artifactId: 'blade', x: 0, y: 0, width: 1, height: 1 },
    { id: 'row_knot', artifactId: 'knot', x: 1, y: 0, width: 1, height: 1 }
  ];
  const port = createArtifactFusionPort({
    query: async (sql, params) => {
      calls.push({ type: 'query', sql, params });
      return { rows: [], rowCount: 1 };
    },
    getArtifactById: (artifactId) => artifacts.get(artifactId),
    createId: (prefix) => `${prefix}_1`,
    nowIso: () => '2026-07-07T00:00:00.000Z',
    findArtifactFusionMatches: () => [{
      recipeId: 'recipe_1',
      resultArtifactId: 'fused',
      ingredientRowIds: ['row_blade', 'row_knot'],
      ingredientArtifactIds: ['blade', 'knot'],
      ingredients: rows
    }],
    readCurrentRoundItems: async () => rows,
    nextSortOrder: async () => 8,
    deleteLoadoutItem: async (_client, itemId) => calls.push({ type: 'delete', itemId }),
    insertLoadoutItem: async (_client, params) => {
      calls.push({ type: 'insertLoadout', params });
      return 'row_fused';
    }
  });

  const applied = await port.applyRoundStartFusions(null, 'run_1', 'player_1', 3);

  assert.deepEqual(applied, [{
    id: 'grfusion_1',
    recipeId: 'recipe_1',
    sourceRoundNumber: 2,
    resultRoundNumber: 3,
    resultArtifactId: 'fused',
    resultRowId: 'row_fused',
    ingredientRowIds: ['row_blade', 'row_knot'],
    ingredientArtifactIds: ['blade', 'knot'],
    ingredients: rows
  }]);
  assert.deepEqual(calls.filter((call) => call.type === 'delete').map((call) => call.itemId), ['row_blade', 'row_knot']);
  assert.equal(calls.find((call) => call.type === 'insertLoadout').params.sortOrder, 8);
  const revealInsert = calls.find((call) => call.type === 'query');
  assert.match(revealInsert.sql, /INSERT INTO game_run_fusions/);
  assert.deepEqual(JSON.parse(revealInsert.params[8]), ['blade', 'knot']);
  assert.equal(revealInsert.params[10], '2026-07-07T00:00:00.000Z');
});

test('[server-port][mushroom gameplay] reads fusion reveals through injected query', async () => {
  const port = createArtifactFusionPort({
    query: async () => ({
      rowCount: 1,
      rows: [{
        id: 'fusion_1',
        recipe_id: 'recipe_1',
        source_round_number: 1,
        result_round_number: 2,
        result_artifact_id: 'fused',
        result_row_id: 'row_fused',
        ingredient_artifact_ids_json: '["blade","knot"]',
        ingredient_rows_json: '[{"id":"row_blade","artifactId":"blade"}]'
      }]
    }),
    getArtifactById: () => null,
    createId: (prefix) => `${prefix}_unused`,
    nowIso: () => '2026-07-07T00:00:00.000Z',
    findArtifactFusionMatches: () => [],
    readCurrentRoundItems: async () => [],
    nextSortOrder: async () => 0,
    deleteLoadoutItem: async () => undefined,
    insertLoadoutItem: async () => 'row_unused'
  });

  assert.deepEqual(await port.readFusionReveals(null, 'run_1', 'player_1', 2), [{
    id: 'fusion_1',
    recipeId: 'recipe_1',
    sourceRoundNumber: 1,
    resultRoundNumber: 2,
    resultArtifactId: 'fused',
    resultRowId: 'row_fused',
    ingredientArtifactIds: ['blade', 'knot'],
    ingredients: [{ id: 'row_blade', artifactId: 'blade' }]
  }]);
});
