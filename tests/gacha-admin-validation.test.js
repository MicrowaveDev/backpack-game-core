import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGachaAdminPackDraftDiff,
  catalogWithGachaAdminPlanRows,
  createGachaAdminReleaseChecklist,
  gachaAdminAssetPolicyRecommendationsFromChecklist,
  gachaAdminPackSnapshot,
  gachaAdminPlanAssetId,
  gachaAdminPlanCatalogAssetFromRow,
  gachaAdminPromotedPlanMetadata,
  gachaAdminPromotionPackItemMetadata,
  normalizeGachaAdminFixture,
  normalizeGachaAdminPlanItemIds,
  resolveGachaAdminPlanItemAssetContract,
  summarizeGachaAdminPlanItems
} from '../src/modules/gacha/admin-validation.js';

function pack(overrides = {}) {
  return {
    id: 'starter_pack',
    status: 'active',
    startsAt: '2026-08-01T00:00:00.000Z',
    endsAt: '2026-09-01T00:00:00.000Z',
    rollPriceCurrencyCode: 'soft_coin',
    rollPriceAmount: 100,
    metadata: {
      disclosure: { en: 'Contains random portraits.' }
    },
    items: [
      { assetId: 'skin.a', rarity: 'common', dropWeight: 100, copyLimit: 1 },
      { assetId: 'skin.b', rarity: 'rare', dropWeight: 10, copyLimit: 1 }
    ],
    ...overrides
  };
}

test('[gacha-admin-validation] creates release checklist blockers, passes, and policy recommendations', () => {
  const releaseReady = createGachaAdminReleaseChecklist({
    runtimePack: pack(),
    validation: { ok: true, errors: [], warnings: [] },
    seasonRow: { status: 'active' },
    collectionRow: { status: 'future' },
    catalog: [
      { assetId: 'skin.a', acquisitionMode: 'gacha', packId: 'starter_pack' },
      { assetId: 'skin.b', acquisitionMode: 'direct', packId: null }
    ]
  });

  assert.equal(releaseReady.ok, true);
  assert.ok(releaseReady.passed.some((issue) => issue.code === 'runtime_validation_ok'));
  assert.ok(releaseReady.passed.some((issue) => issue.code === 'price_present'));
  assert.ok(releaseReady.warnings.some((issue) => issue.code === 'asset_policy_mapping_recommended'));
  assert.deepEqual(gachaAdminAssetPolicyRecommendationsFromChecklist(releaseReady), [{
    assetId: 'skin.b',
    current: { acquisitionMode: 'direct', packId: null },
    recommended: { acquisitionMode: 'gacha', packId: 'starter_pack' }
  }]);

  const blocked = createGachaAdminReleaseChecklist({
    runtimePack: pack({
      startsAt: null,
      endsAt: null,
      rollPriceCurrencyCode: 'wrong',
      rollPriceAmount: 0,
      metadata: {}
    }),
    validation: { ok: false, errors: [{ code: 'item_asset_unknown' }], warnings: [] },
    seasonRow: { status: 'draft' },
    collectionRow: { status: 'disabled' }
  });

  assert.equal(blocked.ok, false);
  assert.ok(blocked.blockers.some((issue) => issue.code === 'runtime_validation_failed' && issue.errorCodes.includes('item_asset_unknown')));
  assert.ok(blocked.blockers.some((issue) => issue.code === 'pack_starts_at_missing'));
  assert.ok(blocked.blockers.some((issue) => issue.code === 'pack_ends_at_missing'));
  assert.ok(blocked.blockers.some((issue) => issue.code === 'disclosure_copy_missing'));
  assert.ok(blocked.blockers.some((issue) => issue.code === 'price_missing_or_invalid'));
  assert.ok(blocked.blockers.some((issue) => issue.code === 'currency_unsupported'));
  assert.ok(blocked.warnings.some((issue) => issue.code === 'season_not_release_ready'));
  assert.ok(blocked.warnings.some((issue) => issue.code === 'collection_not_release_ready'));
});

test('[gacha-admin-validation] warns when duplicate-enabled packs have no copy caps', () => {
  const checklist = createGachaAdminReleaseChecklist({
    runtimePack: pack({
      duplicatePolicy: { mode: 'allow_duplicates' },
      items: [{ assetId: 'skin.a', rarity: 'common', dropWeight: 100 }]
    }),
    validation: { ok: true, errors: [], warnings: [] }
  });

  assert.ok(checklist.warnings.some((issue) => issue.code === 'duplicate_copy_cap_missing'));
});

test('[gacha-admin-validation] snapshots packs and builds live/draft diffs', () => {
  const rowSnapshot = gachaAdminPackSnapshot({
    id: 'row_pack',
    season_id: 'season_1',
    collection_id: 'portraits',
    name_json: JSON.stringify({ en: 'Row pack' }),
    roll_price_currency_code: 'soft_coin',
    roll_price_amount: '25',
    roll_size: '5',
    metadata_json: JSON.stringify({ disclosure: { en: 'Odds shown.' } }),
    items: [{
      asset_id: 'skin.row',
      rarity: 'rare',
      drop_weight: '12',
      copy_limit: '1',
      metadata_json: JSON.stringify({ source: 'fixture' })
    }]
  });
  assert.equal(rowSnapshot.seasonId, 'season_1');
  assert.equal(rowSnapshot.name.en, 'Row pack');
  assert.equal(rowSnapshot.rollPriceAmount, 25);
  assert.deepEqual(rowSnapshot.items, [{
    assetId: 'skin.row',
    rarity: 'rare',
    dropWeight: 12,
    metadata: { source: 'fixture' },
    copyLimit: 1
  }]);

  const diff = buildGachaAdminPackDraftDiff({
    basePack: pack({
      id: 'live_pack',
      rollPriceCurrencyCode: 'soft_coin',
      rollPriceAmount: 100,
      items: [
        { assetId: 'skin.a', rarity: 'common', dropWeight: 100, copyLimit: 1 },
        { assetId: 'skin.b', rarity: 'rare', dropWeight: 10, copyLimit: 1 }
      ]
    }),
    draftPack: pack({
      id: 'draft_pack',
      rollPriceCurrencyCode: 'premium_coin',
      rollPriceAmount: 120,
      items: [
        { assetId: 'skin.a', rarity: 'common', dropWeight: 80, copyLimit: 1 },
        { assetId: 'skin.c', rarity: 'epic', dropWeight: 5, copyLimit: 1 }
      ]
    }),
    basePackId: 'live_pack'
  });

  assert.equal(diff.basePackId, 'live_pack');
  assert.equal(diff.missingBase, false);
  assert.ok(diff.changedFields.some((change) => change.field === 'rollPriceCurrencyCode' && change.after === 'premium_coin'));
  assert.ok(diff.changedFields.some((change) => change.field === 'rollPriceAmount' && change.after === 120));
  assert.deepEqual(diff.addedItems, ['skin.c']);
  assert.deepEqual(diff.removedItems, ['skin.b']);
  assert.deepEqual(diff.changedItems, [{
    assetId: 'skin.a',
    changes: [{ field: 'dropWeight', before: 100, after: 80 }]
  }]);

  assert.deepEqual(buildGachaAdminPackDraftDiff({ draftPack: { id: 'draft', metadata: { basePackId: 'missing' } } }), {
    basePackId: 'missing',
    missingBase: true,
    changedFields: [],
    addedItems: [],
    removedItems: [],
    changedItems: []
  });
});

test('[gacha-admin-validation] normalizes fixtures and nested flat items', () => {
  const normalized = normalizeGachaAdminFixture({
    seasons: [{ id: 'season_1' }],
    collections: [{ id: 'collection_1' }],
    planItems: [{ id: 'plan_1' }],
    packs: [{ id: 'pack_1' }],
    items: [{ id: 'item_1', packId: 'pack_1', assetId: 'skin.a' }]
  });

  assert.equal(normalized.schemaVersion, 'gacha-admin-fixture/v1');
  assert.equal(normalized.packs[0].items.length, 1);
  assert.equal(normalized.packs[0].items[0].id, 'item_1');
  assert.throws(() => normalizeGachaAdminFixture({ seasons: [{ id: 'dup' }, { id: 'dup' }] }), /duplicate id dup/);
});

test('[gacha-admin-validation] resolves plan item asset-id contract without DB access', () => {
  const beforeRow = {
    id: 'plan_1',
    character_id: 'thalla',
    asset_id: 'planned_portrait.thalla.plan_1'
  };

  const synced = resolveGachaAdminPlanItemAssetContract({
    beforeRow,
    fields: { character_id: 'mira' },
    payload: {},
    hasPackLink: false
  });
  assert.equal(synced.assetIdToReserve, 'planned_portrait.mira.plan_1');
  assert.equal(synced.fields.asset_id, 'planned_portrait.mira.plan_1');

  assert.throws(() => resolveGachaAdminPlanItemAssetContract({
    beforeRow,
    fields: { character_id: 'mira' },
    payload: {},
    hasPackLink: true
  }), /character cannot change/);

  assert.throws(() => resolveGachaAdminPlanItemAssetContract({
    beforeRow,
    fields: {},
    payload: { assetId: 'custom.asset' }
  }), /assetId is immutable/);
});

test('[gacha-admin-validation] projects ready plan rows and promotion metadata', () => {
  const planRow = {
    id: 'plan_1',
    season_id: 'season_1',
    character_id: 'thalla',
    asset_id: 'planned_portrait.thalla.plan_1',
    image_path: '/gacha-plan/season_1/plan_1.png',
    file_name: 'plan_1.png',
    mime_type: 'image/png',
    rarity: 'rare',
    drop_weight: 15,
    status: 'ready',
    metadata_json: JSON.stringify({ name: { en: 'Moon cap' } })
  };
  const asset = gachaAdminPlanCatalogAssetFromRow(planRow, { catalog: [] });

  assert.equal(asset.assetId, 'planned_portrait.thalla.plan_1');
  assert.equal(asset.source, 'gacha_plan');
  assert.equal(asset.targetId, 'thalla');
  assert.equal(asset.name.en, 'Moon cap');
  assert.equal(gachaAdminPlanAssetId('thalla', 'plan_1'), 'planned_portrait.thalla.plan_1');
  assert.equal(catalogWithGachaAdminPlanRows([], [planRow]).length, 1);

  const packRow = { id: 'pack_1' };
  assert.deepEqual(gachaAdminPromotionPackItemMetadata(planRow, packRow, { note: 'keep' }), {
    note: 'keep',
    source: 'gacha_plan',
    sourcePlanItemId: 'plan_1',
    sourceSeasonId: 'season_1',
    characterId: 'thalla',
    imagePath: '/gacha-plan/season_1/plan_1.png',
    fileName: 'plan_1.png',
    mimeType: 'image/png',
    promotedToPackId: 'pack_1'
  });

  assert.deepEqual(gachaAdminPromotedPlanMetadata(planRow, { id: 'pack_item_1' }, packRow, {
    now: '2026-08-02T00:00:00.000Z'
  }), {
    name: { en: 'Moon cap' },
    promotedPackIds: ['pack_1'],
    promotedPackItemIds: { pack_1: 'pack_item_1' },
    lastPromotedAt: '2026-08-02T00:00:00.000Z',
    lastPromotedPackId: 'pack_1',
    lastPromotedPackItemId: 'pack_item_1'
  });
});

test('[gacha-admin-validation] summarizes plan coverage and validates promotion id lists', () => {
  const summary = summarizeGachaAdminPlanItems([
    { seasonId: 'season_1', characterId: 'thalla', status: 'ready', dropWeight: 10 },
    { seasonId: 'season_1', characterId: 'thalla', status: 'planned', dropWeight: 5 }
  ], {
    characterOptions: [
      { id: 'thalla', label: 'Thalla' },
      { id: 'mira', label: 'Mira' }
    ],
    targetPerCharacter: 2
  });

  assert.equal(summary.targetPerCharacter, 2);
  assert.equal(summary.seasons[0].total, 2);
  assert.equal(summary.seasons[0].characters.find((row) => row.characterId === 'thalla').enough, true);
  assert.equal(summary.seasons[0].characters.find((row) => row.characterId === 'mira').missing, 2);
  assert.deepEqual(normalizeGachaAdminPlanItemIds(['a', 'b']), ['a', 'b']);
  assert.throws(() => normalizeGachaAdminPlanItemIds('a'), /must be an array/);
});
