import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createArtifactFusionPort,
  createGameRunLoadoutPort,
  createMushroomBattleEnginePort,
  createMushroomBattleServicePort,
  createMushroomGameServicePort,
  createMushroomShopServicePort,
  createSeasonProgressPort
} from '@microwavedev/backpack-game-core/server/ports/mushroom/gameplay';
import {
  createRunAchievementService,
  createSeasonLevelService
} from '@microwavedev/backpack-game-core/modules/season';

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

test('[server-port][mushroom gameplay] awards season progress through injected helpers', async () => {
  const calls = [];
  const season = createSeasonLevelService({
    levels: [
      { id: 'bronze', minPoints: 0 },
      { id: 'silver', minPoints: 10 }
    ]
  });
  const achievements = createRunAchievementService({
    achievements: {
      general: [{
        id: 'season_silver',
        criteria: { minSeasonLevel: 'silver' }
      }]
    },
    seasonLevelRank: season.seasonLevelRank
  });
  let nextId = 0;
  const port = createSeasonProgressPort({
    currentSeasonId: 'season_test',
    createId: (prefix) => `${prefix}_${++nextId}`,
    nowIso: () => '2026-07-07T00:00:00.000Z',
    calculateRawSeasonPoints: season.calculateRawSeasonPoints,
    getSeasonPointsBreakdown: season.getSeasonPointsBreakdown,
    getSeasonLevel: season.getSeasonLevel,
    applySeasonPointProtection: season.applySeasonPointProtection,
    seasonLevelRank: season.seasonLevelRank,
    getAwardableRunAchievements: achievements.getAwardableRunAchievements
  });
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (/FROM player_season_runs/.test(sql)) return { rows: [], rowCount: 0 };
      if (/FROM player_season_progress/.test(sql)) return { rows: [], rowCount: 0 };
      if (/SELECT achievement_id FROM player_achievements/.test(sql)) return { rows: [], rowCount: 0 };
      if (/SELECT source_id FROM player_achievements/.test(sql)) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    }
  };

  const result = await port.awardRunSeasonProgress(client, {
    playerId: 'player_1',
    gameRunId: 'run_1',
    characterId: 'ruby',
    endReason: 'max_rounds',
    wins: 4,
    losses: 0,
    completedRounds: 4,
    livesRemaining: 2
  });

  assert.equal(result.season.seasonId, 'season_test');
  assert.equal(result.season.levelId, 'silver');
  assert.equal(result.achievements[0].id, 'season_silver');
  assert.ok(calls.some((call) => /INSERT INTO player_season_runs/.test(call.sql)));
  assert.ok(calls.some((call) => /INSERT INTO player_achievements/.test(call.sql)));
});

test('[server-port][mushroom gameplay] simulates battles through injected catalogs and tuning', () => {
  const artifacts = new Map([
    ['thorn', {
      id: 'thorn',
      family: 'damage',
      bonus: { damage: 3, stunChance: 6 },
      battleEffect: { id: 'thorn_flash', trigger: 'hit', statKey: 'damage' }
    }],
    ['guard', {
      id: 'guard',
      family: 'armor',
      bonus: { armor: 2 },
      battleEffect: { id: 'guard_block', trigger: 'block', statKey: 'armor' }
    }]
  ]);
  const mushrooms = new Map([
    ['thalla', {
      id: 'thalla',
      name: { en: 'Thalla' },
      styleTag: 'control',
      baseStats: { health: 30, attack: 7, speed: 4, defense: 1 }
    }],
    ['lomie', {
      id: 'lomie',
      name: { en: 'Lomie' },
      styleTag: 'defense',
      baseStats: { health: 30, attack: 4, speed: 1, defense: 2 }
    }]
  ]);
  const port = createMushroomBattleEnginePort({
    getArtifactById: (artifactId) => artifacts.get(artifactId),
    getMushroomById: (mushroomId) => mushrooms.get(mushroomId),
    buildArtifactSummary: (items = []) => items.reduce((totals, item) => {
      const artifact = artifacts.get(item.artifactId);
      totals.damage += Number(artifact?.bonus?.damage || 0);
      totals.speed += Number(artifact?.bonus?.speed || 0);
      totals.armor += Number(artifact?.bonus?.armor || 0);
      totals.stunChance += Number(artifact?.bonus?.stunChance || 0);
      return totals;
    }, { damage: 0, speed: 0, armor: 0, stunChance: 0 }),
    createRng: () => () => 0,
    stepCap: 1,
    maxStunChance: 35
  });

  const result = port.simulateBattle({
    left: {
      playerId: 'player_1',
      mushroomId: 'thalla',
      loadout: { items: [{ id: 'row_thorn', artifactId: 'thorn', x: 0, y: 0 }] }
    },
    right: {
      playerId: 'player_2',
      mushroomId: 'lomie',
      loadout: { items: [{ id: 'row_guard', artifactId: 'guard', x: 0, y: 0 }] }
    }
  }, 'seed');

  const action = result.events.find((event) => event.type === 'action' && event.actorSide === 'left');
  assert.equal(action.actionName, 'Spore Lash');
  assert.equal(action.artifactAttribution.damage[0].artifactId, 'thorn');
  assert.equal(action.artifactAttribution.armor[0].artifactId, 'guard');
  assert.equal(action.effectTags[0].id, 'thorn_flash');
  assert.equal(result.leftState.mushroomId, 'thalla');
});

test('[server-port][mushroom gameplay] reads snapshots and battles through injected repositories', async () => {
  const calls = [];
  let capturedBudget = null;
  let id = 0;
  const port = createMushroomBattleServicePort({
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (/FROM battles/.test(sql)) {
        return {
          rowCount: 1,
          rows: [{
            id: 'battle_1',
            mode: 'solo',
            opponent_kind: 'bot',
            rated_scope: 'solo',
            battle_seed: 'seed',
            outcome: 'win',
            winner_side: 'left',
            created_at: '2026-07-07T00:00:00.000Z'
          }]
        };
      }
      if (/FROM battle_snapshots/.test(sql)) {
        return {
          rowCount: 2,
          rows: [
            { side: 'left', payload_json: '{"mushroomId":"thalla"}' },
            { side: 'right', payload_json: '{"mushroomId":"lomie"}' }
          ]
        };
      }
      if (/FROM battle_events/.test(sql)) {
        return { rowCount: 1, rows: [{ payload_json: '{"type":"battle_start"}' }] };
      }
      if (/FROM battle_rewards/.test(sql)) return { rowCount: 0, rows: [] };
      if (/FROM game_rounds/.test(sql)) return { rowCount: 0, rows: [] };
      return { rowCount: 0, rows: [] };
    },
    getMushroomById: (mushroomId) => ({ name: { en: mushroomId } }),
    getStarterPresetCost: () => 2,
    bagColumns: 6,
    roundIncome: [5, 5, 5],
    portraitUrl: (mushroomId, portraitId) => `/portraits/${mushroomId}-${portraitId}.png`,
    createId: (prefix) => `${prefix}_${++id}`,
    dayKey: () => '2026-07-07',
    nowIso: () => '2026-07-07T00:00:00.000Z',
    parseJson: (value, fallback) => {
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    effectiveGridHeight: () => 4,
    validateLoadoutItems: (_items, budget) => {
      capturedBudget = budget;
    },
    normalizeRotation: (value) => Number(value || 0),
    resolveEquippedPortraitId: async () => 'default'
  });
  const activeClient = {
    async query(sql) {
      if (/FROM player_active_character/.test(sql)) {
        return { rowCount: 1, rows: [{ mushroom_id: 'thalla' }] };
      }
      if (/FROM game_run_players/.test(sql)) {
        return { rowCount: 1, rows: [{ game_run_id: 'run_1', current_round: 2 }] };
      }
      if (/FROM game_run_loadout_items/.test(sql)) {
        return {
          rowCount: 1,
          rows: [{
            id: 'row_1',
            artifact_id: 'thorn',
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            sort_order: 1,
            active: 0,
            rotated: 0
          }]
        };
      }
      return { rowCount: 0, rows: [] };
    }
  };

  const snapshot = await port.getActiveSnapshot(activeClient, 'player_1');
  assert.equal(snapshot.mushroomId, 'thalla');
  assert.equal(snapshot.imagePath, '/portraits/thalla-default.png');
  assert.equal(snapshot.loadout.gridWidth, 6);
  assert.equal(capturedBudget, 12);

  const battleClient = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rowCount: 1, rows: [] };
    }
  };
  const battle = await port.recordBattle(battleClient, {
    leftSnapshot: { playerId: 'player_1', mushroomId: 'thalla' },
    rightSnapshot: { playerId: 'player_2', mushroomId: 'lomie' },
    simulation: { winnerSide: 'left', events: [{ type: 'battle_start' }, { type: 'battle_end' }] },
    battleSeed: 'seed',
    mode: 'solo',
    opponentKind: 'bot',
    ratedScope: 'solo',
    challengeId: null,
    initiatorPlayerId: 'player_1'
  });
  assert.equal(battle.id, 'battle_1');
  assert.ok(calls.some((call) => /INSERT INTO battles/.test(call.sql)));
  assert.equal(calls.filter((call) => /INSERT INTO battle_events/.test(call.sql)).length, 2);

  const shaped = await port.getBattle('battle_1', 'player_1');
  assert.equal(shaped.id, 'battle_1');
  assert.equal(shaped.snapshots.left.mushroomId, 'thalla');
  assert.equal(shaped.events[0].type, 'battle_start');
});

test('[server-port][mushroom gameplay] runs shop mutations through injected repositories', async () => {
  const artifacts = {
    blade: { id: 'blade', family: 'damage', width: 1, height: 1, price: 3 },
    bag: { id: 'bag', family: 'bag', width: 2, height: 2, price: 5 },
    charm: { id: 'charm', family: 'damage', width: 1, height: 1, price: 2 }
  };
  let activeClient = null;
  const insertedRows = [];
  const refunds = [];
  const deletedRows = [];
  const port = createMushroomShopServicePort({
    withTransaction: async (fn) => fn(activeClient),
    withRunLock: async (_gameRunId, fn) => fn(),
    bagBaseChance: 0,
    bagEscalationStep: 0,
    bagPityThreshold: 99,
    bags: ['bag'],
    combatArtifacts: ['blade'],
    getArtifactById: (artifactId) => artifacts[artifactId] || null,
    getArtifactPrice: (artifact) => artifact.price,
    getEligibleCharacterItems: (mushroomId, level) => (mushroomId === 'thalla' && level >= 2 ? ['charm'] : []),
    getShopRefreshCost: (refreshCount) => (refreshCount < 3 ? 1 : 2),
    shopOfferSize: 2,
    computeCharacterLevel: (xp) => ({ level: Math.floor(Number(xp || 0) / 100) + 1 }),
    createRng: () => () => 0,
    nowIso: () => '2026-07-08T00:00:00.000Z',
    parseJson: (value, fallback) => {
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    runCurrencyFields: (coins) => ({ coins, runCurrency: coins }),
    isBag: (artifact) => artifact?.family === 'bag',
    bagsContainingItem: () => [],
    deleteLoadoutItemByIdScoped: async (_client, params) => {
      const row = { id: params.rowId, artifactId: 'blade' };
      deletedRows.push(row);
      return row;
    },
    deleteOneByArtifactId: async () => null,
    insertLoadoutItem: async (_client, row) => {
      insertedRows.push(row);
      return 'row_new';
    },
    insertRefund: async (_client, row) => {
      refunds.push(row);
    },
    nextSortOrder: async () => 7,
    readCurrentRoundItems: async () => [{
      id: 'row_blade',
      artifactId: 'blade',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      purchasedRound: 1
    }]
  });

  const updates = [];
  activeClient = {
    async query(sql, params) {
      if (/SELECT current_round FROM game_runs/.test(sql)) {
        return { rowCount: 1, rows: [{ current_round: 1 }] };
      }
      if (/SELECT \* FROM game_run_players/.test(sql)) {
        return { rowCount: 1, rows: [{ id: 'grp_1', coins: 10 }] };
      }
      if (/SELECT offer_json FROM game_run_shop_states/.test(sql)) {
        return { rowCount: 1, rows: [{ offer_json: '["blade","bag"]' }] };
      }
      updates.push({ sql, params });
      return { rowCount: 1, rows: [] };
    }
  };
  const buy = await port.buyRunShopItem('player_1', 'run_1', 'blade');
  assert.equal(buy.id, 'row_new');
  assert.equal(buy.coins, 7);
  assert.equal(insertedRows[0].sortOrder, 7);
  assert.deepEqual(buy.shopOffer, ['bag']);

  activeClient = {
    async query(sql, params) {
      if (/SELECT current_round, mode FROM game_runs/.test(sql)) {
        return { rowCount: 1, rows: [{ current_round: 1, mode: 'solo' }] };
      }
      if (/SELECT \* FROM game_run_players/.test(sql)) {
        return { rowCount: 1, rows: [{ id: 'grp_1', coins: 3 }] };
      }
      if (/SELECT \* FROM game_run_shop_states/.test(sql)) {
        return { rowCount: 1, rows: [{ refresh_count: 0, rounds_since_bag: 1, round_number: 1 }] };
      }
      if (/FROM player_active_character/.test(sql)) {
        return { rowCount: 1, rows: [{ mushroom_id: 'thalla' }] };
      }
      if (/FROM player_mushrooms/.test(sql)) {
        return { rowCount: 1, rows: [{ mycelium: 250 }] };
      }
      updates.push({ sql, params });
      return { rowCount: 1, rows: [] };
    }
  };
  const refresh = await port.refreshRunShop('player_1', 'run_1');
  assert.equal(refresh.coins, 2);
  assert.equal(refresh.refreshCount, 1);
  assert.equal(refresh.refreshCost, 1);
  assert.equal(refresh.shopOffer.length, 2);

  activeClient = {
    async query(sql, params) {
      if (/SELECT current_round FROM game_runs/.test(sql)) {
        return { rowCount: 1, rows: [{ current_round: 1 }] };
      }
      if (/SELECT \* FROM game_run_players/.test(sql)) {
        return { rowCount: 1, rows: [{ id: 'grp_1', coins: 2 }] };
      }
      updates.push({ sql, params });
      return { rowCount: 1, rows: [] };
    }
  };
  const sell = await port.sellRunItem('player_1', 'run_1', { id: 'row_blade' });
  assert.equal(sell.id, 'row_blade');
  assert.equal(sell.sellPrice, 3);
  assert.equal(sell.coins, 5);
  assert.equal(deletedRows[0].id, 'row_blade');
  assert.equal(refunds[0].refundAmount, 3);
});

test('[server-port][mushroom gameplay] assembles bootstrap state through injected services', async () => {
  const port = createMushroomGameServicePort({
    query: async (sql, params) => {
      assert.match(sql, /daily_rate_limits/);
      assert.deepEqual(params, ['player_1', '2026-07-08']);
      return { rowCount: 1, rows: [{ battle_starts: 3 }] };
    },
    artifacts: [{ id: 'blade' }],
    dailyBattleLimit: 9,
    mushroomsForResponse: () => [{ id: 'thalla' }],
    dayKey: () => '2026-07-08',
    nextUtcReset: () => new Date('2026-07-09T00:00:00.000Z'),
    getBattleHistory: async (playerId, limit) => [{ playerId, limit, id: 'battle_1' }],
    getPlayerState: async () => ({
      player: { id: 'player_1' },
      activeMushroomId: 'thalla',
      settings: { lang: 'en' }
    }),
    getActiveGameRuns: async () => [
      { id: 'legacy_run', mode: 'solo', player: {} },
      { id: 'other_run', mode: 'solo', mushroomId: 'lomie', player: { mushroomId: 'lomie' } }
    ],
    getGameRunHistory: async (_playerId, limit) => [{ id: 'run_old', limit }],
    getHomeFieldConfig: () => ({ enabled: true }),
    directBuyPolicy: () => 'allow',
    getAssetPacksForPlayer: async () => [
      { id: 'pack_active', active: true },
      { id: 'pack_inactive', active: false }
    ],
    getRuntimeAssetCatalog: async () => [{ assetId: 'portrait.thalla.default' }],
    isAssetGachaEnabled: () => true
  });

  const bootstrap = await port.getBootstrap('player_1');
  assert.equal(bootstrap.activeGameRun.id, 'legacy_run');
  assert.equal(bootstrap.activeGameRun.mushroomId, 'thalla');
  assert.equal(bootstrap.activeGameRuns[0].player.mushroomId, 'thalla');
  assert.deepEqual(bootstrap.battleLimit, {
    used: 3,
    limit: 9,
    nextResetAt: '2026-07-09T00:00:00.000Z'
  });
  assert.deepEqual(bootstrap.assetAcquisition.activePackIds, ['pack_active']);
  assert.equal(bootstrap.assetAcquisition.gachaEnabled, true);
  assert.equal(bootstrap.battleHistory[0].limit, 10);
  assert.equal(bootstrap.gameRunHistory[0].limit, 10);
});
