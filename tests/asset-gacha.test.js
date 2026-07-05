import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceAssetGachaPackPityState,
  chooseWeightedAssetGachaCandidate,
  computeAssetGachaPackPityState,
  createAssetGachaBurnGrantDrafts,
  createAssetGachaBurnSettlementPlan,
  createAssetGachaBurnSourceMetadata,
  createAssetGachaRollGrantDrafts,
  createAssetGachaRollSettlementPlan,
  evaluateAssetAcquisitionPolicy,
  normalizeAssetGachaBurnRules,
  normalizeAssetGachaBurnExchangeRow,
  normalizeAssetGachaRollRow,
  resolveAssetCatalogAcquisitionPolicy,
  resolveAssetGachaRollCandidates,
  selectAssetGachaBurnTargets,
  selectAssetGachaBurnSourceRows,
  selectAssetGachaRollResults,
  shapeAssetGachaBurnSettlementItems,
  shapeAssetGachaBurnResult,
  shapeAssetGachaPack,
  shapeAssetGachaRollSettlementItems,
  shapeAssetGachaRollResult,
  validateAssetGachaPack
} from '../src/index.js';

const catalog = [
  { assetId: 'skin.a', rarity: 'common', acquisitionMode: 'both', packId: 'starter_pack' },
  { assetId: 'skin.e', rarity: 'common', acquisitionMode: 'gacha', packId: 'starter_pack' },
  { assetId: 'skin.b', rarity: 'rare', acquisitionMode: 'gacha', packId: 'starter_pack' },
  { assetId: 'skin.c', rarity: 'rare', acquisitionMode: 'gacha', packId: 'starter_pack' },
  { assetId: 'skin.d', rarity: 'epic', acquisitionMode: 'gacha', packId: 'starter_pack' }
];

function pack(overrides = {}) {
  return {
    id: 'starter_pack',
    seasonId: 'season_1',
    collectionId: 'skins',
    status: 'active',
    startsAt: null,
    endsAt: null,
    rollPriceCurrencyCode: 'soft_coin',
    rollPriceAmount: 100,
    rollSize: 1,
    rarityTableVersion: 'starter:v1',
    items: [
      { assetId: 'skin.a', rarity: 'common', dropWeight: 100 },
      { assetId: 'skin.b', rarity: 'rare', dropWeight: 10 },
      { assetId: 'skin.c', rarity: 'rare', dropWeight: 10 },
      { assetId: 'skin.d', rarity: 'epic', dropWeight: 1 }
    ],
    ...overrides
  };
}

function sequenceRng(values) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

test('[asset-gacha] validates authored packs and reports authoring issues', () => {
  const valid = validateAssetGachaPack(pack(), { catalog });
  assert.equal(valid.ok, true);

  const invalid = validateAssetGachaPack(pack({
    rollSize: 11,
    duplicatePolicy: { mode: 'bad_mode', maxCopiesPerAsset: 0 },
    items: [
      { assetId: 'skin.a', rarity: 'common', dropWeight: 100 },
      { assetId: 'skin.a', rarity: 'common', dropWeight: 100 },
      { assetId: 'missing', rarity: 'mythic', dropWeight: 0 }
    ],
    burnRules: [
      { id: 'bad_burn', sourceRarity: 'common', sourceCount: 0, targetMinRarity: 'mythic', targetCount: 99, targetDuplicatePolicy: 'owned_only' }
    ]
  }), { catalog });

  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.find((issue) => issue.code === 'roll_size_invalid'));
  assert.ok(invalid.errors.find((issue) => issue.code === 'item_asset_duplicate'));
  assert.ok(invalid.errors.find((issue) => issue.code === 'item_asset_unknown'));
  assert.ok(invalid.errors.find((issue) => issue.code === 'duplicate_policy_invalid'));
  assert.ok(invalid.errors.find((issue) => issue.code === 'burn_target_policy_invalid'));
});

test('[asset-gacha] evaluates direct buy and roll policy without product routes', () => {
  const policy = evaluateAssetAcquisitionPolicy(catalog[0], {
    gachaEnabled: true,
    directBuyPolicy: 'block_gacha_assets',
    pack: { id: 'starter_pack', active: true }
  });

  assert.equal(policy.purchaseAvailable, false);
  assert.equal(policy.rollAvailable, true);
  assert.equal(policy.activePackId, 'starter_pack');
});

test('[asset-gacha] resolves catalog acquisition defaults and overrides without env access', () => {
  assert.deepEqual(resolveAssetCatalogAcquisitionPolicy({
    assetId: 'skin.free',
    price: 0
  }, {
    defaultPaidMode: 'gacha',
    defaultPackId: 'starter_pack'
  }), {
    acquisitionMode: 'direct',
    packId: null
  });

  assert.deepEqual(resolveAssetCatalogAcquisitionPolicy({
    assetId: 'skin.paid',
    price: 500
  }, {
    defaultPaidMode: 'gacha',
    defaultPackId: 'starter_pack'
  }), {
    acquisitionMode: 'gacha',
    packId: 'starter_pack'
  });

  assert.deepEqual(resolveAssetCatalogAcquisitionPolicy({
    assetId: 'skin.override',
    price: 500
  }, {
    overrides: {
      'skin.override': { acquisitionMode: 'direct', packId: null }
    },
    defaultPaidMode: 'gacha',
    defaultPackId: 'starter_pack'
  }), {
    acquisitionMode: 'direct',
    packId: null
  });

  assert.deepEqual(resolveAssetCatalogAcquisitionPolicy({
    assetId: 'skin.invalid',
    price: 500
  }, {
    overrides: {
      'skin.invalid': { acquisitionMode: 'bad_mode' }
    },
    defaultPaidMode: 'bad_mode',
    defaultPackId: 'starter_pack'
  }), {
    acquisitionMode: 'both',
    packId: 'starter_pack'
  });
});

test('[asset-gacha] filters unowned and duplicate-capped roll candidates', () => {
  const basePack = pack();
  const unownedOnly = resolveAssetGachaRollCandidates(basePack, {
    ownedAssetIds: ['skin.a'],
    catalog
  });
  assert.deepEqual(unownedOnly.map((item) => item.assetId), ['skin.b', 'skin.c', 'skin.d']);

  const duplicatePack = pack({ duplicatePolicy: { mode: 'allow_duplicates', maxCopiesPerAsset: 2 } });
  const withCopies = resolveAssetGachaRollCandidates(duplicatePack, {
    activeAssetRows: [
      { id: 'a1', asset_id: 'skin.a', status: 'active' },
      { id: 'a2', asset_id: 'skin.a', status: 'active' },
      { id: 'b1', asset_id: 'skin.b', status: 'active' }
    ],
    catalog
  });
  assert.deepEqual(withCopies.map((item) => item.assetId), ['skin.b', 'skin.c', 'skin.d']);
  assert.equal(withCopies[0].ownedCopies, 1);
  assert.equal(withCopies[0].copyCapped, false);
});

test('[asset-gacha] selects weighted multi-slot rolls and applies guarantees', () => {
  const rollPack = pack({
    rollSize: 3,
    items: [
      { assetId: 'skin.a', rarity: 'common', dropWeight: 100 },
      { assetId: 'skin.e', rarity: 'common', dropWeight: 100 },
      { assetId: 'skin.b', rarity: 'rare', dropWeight: 10 },
      { assetId: 'skin.c', rarity: 'rare', dropWeight: 10 }
    ],
    slots: [
      { rarityWeights: { common: 100 } },
      { rarityWeights: { common: 100 } },
      { rarityWeights: { common: 100 } }
    ],
    guarantees: [
      { id: 'rare_one', minRarity: 'rare', count: 1 },
      { id: 'rare_two', minRarity: 'rare', count: 2 }
    ]
  });
  const candidates = resolveAssetGachaRollCandidates(rollPack, { catalog });
  const selected = selectAssetGachaRollResults(candidates, rollPack, {
    rng: sequenceRng([0, 0, 0, 0, 0])
  });

  assert.equal(selected.length, 3);
  assert.equal(selected.filter((item) => item.rarity === 'rare').length, 2);
  assert.deepEqual(selected.guaranteeApplications.map((entry) => entry.source), ['guarantee']);
});

test('[asset-gacha] computes and advances pack-scoped pity state', () => {
  const pityPack = pack({
    pityRules: [{ id: 'rare_pity', minRarity: 'rare', threshold: 2, count: 1 }]
  });
  const before = computeAssetGachaPackPityState(pityPack, {
    rolls: [
      {
        createdAt: '2026-01-02T00:00:00.000Z',
        resultAssetIds: ['skin.a'],
        metadata: { results: [{ assetId: 'skin.a', rarity: 'common' }] }
      }
    ]
  });
  assert.equal(before[0].active, true);
  assert.equal(before[0].remaining, 1);

  const afterMiss = advanceAssetGachaPackPityState(before, [{ assetId: 'skin.a', rarity: 'common' }]);
  assert.equal(afterMiss[0].currentMisses, 2);
  assert.equal(afterMiss[0].active, true);

  const afterHit = advanceAssetGachaPackPityState(before, [{ assetId: 'skin.b', rarity: 'rare' }]);
  assert.equal(afterHit[0].currentMisses, 0);
});

test('[asset-gacha] plans roll settlement metadata over selected items', () => {
  const rollPack = pack({
    rollSize: 2,
    duplicatePolicy: 'allow_duplicates',
    items: [
      { assetId: 'skin.a', rarity: 'common', dropWeight: 100 },
      { assetId: 'skin.b', rarity: 'rare', dropWeight: 10 },
      { assetId: 'skin.c', rarity: 'rare', dropWeight: 10 }
    ],
    guarantees: [{ id: 'rare_one', minRarity: 'rare', count: 1 }]
  });
  const candidates = resolveAssetGachaRollCandidates(rollPack, {
    ownedAssetIds: ['skin.a'],
    catalog
  });
  const selected = selectAssetGachaRollResults(candidates, rollPack, {
    rng: sequenceRng([0, 0, 0])
  });
  const pityBefore = computeAssetGachaPackPityState(rollPack, { rolls: [] });
  const plan = createAssetGachaRollSettlementPlan({
    pack: rollPack,
    candidates,
    selectedItems: selected,
    ownedAssetIds: ['skin.a'],
    pityBefore,
    gachaEnabled: true,
    directBuyPolicy: 'block_gacha_assets',
    activePackIds: ['starter_pack'],
    randomSource: 'injected_rng'
  });

  assert.equal(plan.type, 'asset_gacha_roll_settlement');
  assert.equal(plan.walletSpend.reason, 'asset_pack_roll');
  assert.equal(plan.walletSpend.amount, 100);
  assert.equal(plan.rollMetadata.randomSource, 'injected_rng');
  assert.deepEqual(plan.resultAssetIds, ['skin.a', 'skin.b']);
  assert.deepEqual(plan.duplicateAssetIds, ['skin.a']);
  assert.deepEqual(plan.guaranteesApplied, []);

  const grantDrafts = createAssetGachaRollGrantDrafts(plan, {
    rollId: 'roll_1',
    transactionId: 'wtx_1'
  });
  assert.equal(grantDrafts[0].acquisitionSource, 'gacha');
  assert.equal(grantDrafts[0].acquisitionSourceId, 'roll_1');
  assert.equal(grantDrafts[0].metadata.transactionId, 'wtx_1');
  assert.equal(grantDrafts[0].allowDuplicate, true);

  const shaped = shapeAssetGachaRollSettlementItems(plan, {
    grantedItems: [{ instance: { id: 'inst_b' } }, { instance: { id: 'inst_c' } }]
  });
  assert.deepEqual(shaped.resultItems.map((item) => item.resultInstanceId), ['inst_b', 'inst_c']);
  assert.equal(shaped.evidenceItems[0].candidatePoolHash, selected[0].candidatePoolHash);
});

test('[asset-gacha] selects duplicate burn targets with unowned-first policy', () => {
  const burnPack = pack({
    duplicatePolicy: 'allow_duplicates',
    burnRules: [
      { id: 'common_to_rare', sourceRarity: 'common', sourceCount: 2, targetMinRarity: 'rare', targetCount: 1, targetDuplicatePolicy: 'unowned_first' }
    ]
  });
  const [rule] = normalizeAssetGachaBurnRules(burnPack);
  const selected = selectAssetGachaBurnTargets(burnPack, rule, {
    rng: sequenceRng([0]),
    ownedAssetIds: ['skin.a', 'skin.b'],
    catalog
  });

  assert.equal(selected.length, 1);
  assert.equal(selected[0].assetId, 'skin.c');
});

test('[asset-gacha] plans duplicate-burn settlement over source rows and targets', () => {
  const burnPack = pack({
    duplicatePolicy: 'allow_duplicates',
    burnRules: [
      { id: 'common_to_rare', sourceRarity: 'common', sourceCount: 2, targetMinRarity: 'rare', targetCount: 1, targetDuplicatePolicy: 'unowned_first' }
    ]
  });
  const [rule] = normalizeAssetGachaBurnRules(burnPack);
  const activeRows = [
    { id: 'keep_a', asset_id: 'skin.a', status: 'active', acquired_at: '2026-01-01T00:00:00.000Z' },
    { id: 'burn_a_1', asset_id: 'skin.a', status: 'active', acquired_at: '2026-01-02T00:00:00.000Z', metadata_json: '{"note":"one"}' },
    { id: 'burn_a_2', asset_id: 'skin.a', status: 'active', acquired_at: '2026-01-03T00:00:00.000Z' }
  ];
  const sourceRows = selectAssetGachaBurnSourceRows(burnPack, activeRows, rule);
  assert.deepEqual(sourceRows.map((row) => row.id), ['burn_a_1', 'burn_a_2']);

  const targets = selectAssetGachaBurnTargets(burnPack, rule, {
    rng: sequenceRng([0]),
    ownedAssetIds: ['skin.a'],
    catalog
  });
  const plan = createAssetGachaBurnSettlementPlan({
    pack: burnPack,
    rule,
    sourceRows,
    targetItems: targets,
    ownedAssetIdsAfterBurn: ['skin.a'],
    randomSource: 'injected_rng'
  });

  assert.equal(plan.type, 'asset_gacha_burn_settlement');
  assert.deepEqual(plan.sourceAssetInstanceIds, ['burn_a_1', 'burn_a_2']);
  assert.deepEqual(plan.resultAssetIds, ['skin.b']);
  assert.equal(plan.exchangeMetadata.randomSource, 'injected_rng');

  assert.deepEqual(createAssetGachaBurnSourceMetadata(sourceRows[0], plan, {
    exchangeId: 'burn_1',
    now: '2026-07-05T00:00:00.000Z'
  }), {
    note: 'one',
    burnedAt: '2026-07-05T00:00:00.000Z',
    burnExchangeId: 'burn_1',
    burnRuleId: 'common_to_rare',
    burnPackId: 'starter_pack'
  });

  const grantDrafts = createAssetGachaBurnGrantDrafts(plan, { exchangeId: 'burn_1' });
  assert.equal(grantDrafts[0].acquisitionSource, 'asset_burn_exchange');
  assert.equal(grantDrafts[0].metadata.sourceAssetInstanceIds.length, 2);

  const shaped = shapeAssetGachaBurnSettlementItems(plan, {
    grantedItems: [{ instance: { id: 'inst_b' } }]
  });
  assert.equal(shaped.resultItems[0].resultInstanceId, 'inst_b');
});

test('[asset-gacha] shapes pack state for consumer UIs', () => {
  const shaped = shapeAssetGachaPack(pack({ duplicatePolicy: 'allow_duplicates' }), {
    catalog,
    includeAssets: true,
    activeAssetRows: [
      { id: 'a1', asset_id: 'skin.a', status: 'active' },
      { id: 'a2', asset_id: 'skin.a', status: 'active' }
    ],
    equippedAssetInstanceIds: ['a1'],
    gachaEnabled: true
  });

  assert.equal(shaped.active, true);
  assert.equal(shaped.duplicateCopies, 1);
  assert.equal(shaped.items[0].asset.assetId, 'skin.a');
  assert.equal(shaped.items[0].duplicateCopies, 1);
});

test('[asset-gacha] shapes roll and burn result DTOs from persisted rows', () => {
  const rollPack = pack({
    name: { en: 'Starter Pack' },
    rollSize: 2,
    items: [
      { assetId: 'skin.a', rarity: 'common', dropWeight: 100 },
      { assetId: 'skin.b', rarity: 'rare', dropWeight: 10 }
    ]
  });
  const namedCatalog = catalog.map((asset) => ({
    ...asset,
    name: { en: asset.assetId === 'skin.a' ? 'Amber Cut' : 'Ruby Cut' },
    path: `/assets/${asset.assetId}.png`
  }));
  const rollRow = {
    id: 'roll_1',
    player_id: 'player_1',
    pack_id: 'starter_pack',
    currency_code: 'soft_coin',
    price_amount: '100',
    result_asset_ids_json: JSON.stringify(['skin.a', 'skin.b']),
    guarantee_state_json: JSON.stringify({
      guaranteesApplied: [{ id: 'rare_one', selectedAssetId: 'skin.b' }],
      pityBefore: [{ id: 'rare_pity', active: true }],
      pityAfter: [{ id: 'rare_pity', active: false }]
    }),
    candidate_pool_hash: 'abc123',
    selected_asset_id: 'skin.a',
    result_instance_id: 'inst_a',
    idempotency_key: 'roll-key',
    metadata_json: JSON.stringify({
      results: [
        { slotIndex: 0, assetId: 'skin.a', rarity: 'common', selectedRarity: 'common', instanceId: 'inst_a' },
        { slotIndex: 1, assetId: 'skin.b', rarity: 'rare', selectedRarity: 'rare', instanceId: 'inst_b', duplicateCopy: true }
      ]
    }),
    created_at: '2026-07-04T00:00:00.000Z'
  };

  const roll = normalizeAssetGachaRollRow(rollRow);
  const rollResult = shapeAssetGachaRollResult(roll, { pack: rollPack, catalog: namedCatalog });

  assert.equal(roll.priceAmount, 100);
  assert.equal(rollResult.rollId, 'roll_1');
  assert.equal(rollResult.packName, 'Starter Pack');
  assert.equal(rollResult.assetName.en, 'Amber Cut');
  assert.equal(rollResult.count, 2);
  assert.deepEqual(rollResult.items.map((item) => item.assetId), ['skin.a', 'skin.b']);
  assert.equal(rollResult.items[1].duplicateCopy, true);
  assert.equal(rollResult.guaranteesApplied[0].selectedAssetId, 'skin.b');
  assert.equal(rollResult.pityBefore[0].active, true);
  assert.equal(rollResult.pityAfter[0].active, false);

  const burnRow = {
    id: 'burn_1',
    player_id: 'player_1',
    pack_id: 'starter_pack',
    rule_id: 'common_to_rare',
    source_asset_instance_ids_json: JSON.stringify(['inst_old_a', 'inst_old_b']),
    result_asset_ids_json: JSON.stringify(['skin.b']),
    result_instance_ids_json: JSON.stringify(['inst_new_b']),
    metadata_json: JSON.stringify({ duplicateAssetIds: ['skin.b'] }),
    created_at: '2026-07-04T00:00:00.000Z'
  };
  const exchange = normalizeAssetGachaBurnExchangeRow(burnRow);
  const burnResult = shapeAssetGachaBurnResult(exchange, { pack: rollPack, catalog: namedCatalog });

  assert.equal(burnResult.exchangeId, 'burn_1');
  assert.equal(burnResult.ruleId, 'common_to_rare');
  assert.equal(burnResult.assetId, 'skin.b');
  assert.equal(burnResult.assetName.en, 'Ruby Cut');
  assert.equal(burnResult.resultInstanceId, 'inst_new_b');
  assert.equal(burnResult.items[0].rarity, 'rare');
  assert.equal(burnResult.items[0].duplicateCopy, true);
  assert.deepEqual(burnResult.sourceAssetInstanceIds, ['inst_old_a', 'inst_old_b']);
});

test('[asset-gacha] chooses weighted candidates with an injected RNG', () => {
  const selected = chooseWeightedAssetGachaCandidate([
    { assetId: 'a', dropWeight: 1 },
    { assetId: 'b', dropWeight: 9 }
  ], sequenceRng([0.5]));

  assert.equal(selected.assetId, 'b');
});
