import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProfileAssetInstanceDraft,
  createProfileAssetPurchaseSpendMutation,
  createProfileAssetState,
  normalizeProfileAssetEquipmentRow,
  normalizeProfileAssetInstanceRow,
  profileAssetAcquisitionSource,
  profileAssetInstanceDraftToRow,
  profileAssetIsOwned,
  profileAssetTargetKey,
  shapeProfileAssetVariant,
  validateProfileAssetEquipment
} from '@microwavedev/backpack-game-core/profile-asset-state';

const paidPortrait = {
  assetId: 'portrait.axilin.1',
  slot: 'portrait',
  targetType: 'character',
  targetId: 'axilin',
  variantId: '1',
  price: 500,
  currencyCode: 'soft_coin',
  packId: 'season_1_portraits',
  rarity: 'rare'
};

test('[profile-asset-state] normalizes instance and equipment rows', () => {
  assert.deepEqual(normalizeProfileAssetInstanceRow({
    id: 'asset_1',
    player_id: 'player_1',
    asset_id: 'portrait.axilin.1',
    acquisition_source: 'gacha',
    acquisition_source_id: 'roll_1',
    status: 'active',
    acquired_at: '2026-07-04T12:00:00.000Z',
    metadata_json: '{"rarity":"rare"}'
  }), {
    id: 'asset_1',
    playerId: 'player_1',
    assetId: 'portrait.axilin.1',
    acquisitionSource: 'gacha',
    acquisitionSourceId: 'roll_1',
    status: 'active',
    acquiredAt: '2026-07-04T12:00:00.000Z',
    metadata: { rarity: 'rare' }
  });

  assert.deepEqual(normalizeProfileAssetEquipmentRow({
    id: 'equip_1',
    player_id: 'player_1',
    slot: 'portrait',
    target_type: 'character',
    target_id: 'axilin',
    asset_instance_id: 'asset_1',
    asset_id: 'portrait.axilin.1',
    equipped_at: '2026-07-04T12:05:00.000Z'
  }), {
    id: 'equip_1',
    playerId: 'player_1',
    slot: 'portrait',
    targetType: 'character',
    targetId: 'axilin',
    assetInstanceId: 'asset_1',
    assetId: 'portrait.axilin.1',
    equippedAt: '2026-07-04T12:05:00.000Z'
  });
});

test('[profile-asset-state] builds ownership maps while preserving duplicate copies', () => {
  const state = createProfileAssetState({
    instances: [
      { id: 'asset_1', asset_id: 'portrait.axilin.1', status: 'active' },
      { id: 'asset_2', asset_id: 'portrait.axilin.1', status: 'active' },
      { id: 'asset_3', asset_id: 'portrait.thalla.1', status: 'burned' },
      { id: 'asset_4', status: 'active' }
    ],
    equipped: [
      {
        id: 'equip_1',
        slot: 'portrait',
        target_type: 'character',
        target_id: 'axilin',
        asset_instance_id: 'asset_2',
        asset_id: 'portrait.axilin.1',
        equipped_at: '2026-07-04T12:05:00.000Z'
      }
    ]
  });

  assert.equal(state.ownedAssetIds.has('portrait.axilin.1'), true);
  assert.equal(state.ownedAssetIds.has('portrait.thalla.1'), false);
  assert.equal(state.instancesByAssetId.get('portrait.axilin.1').id, 'asset_1');
  assert.deepEqual(
    state.activeInstancesByAssetId.get('portrait.axilin.1').map((row) => row.id),
    ['asset_1', 'asset_2']
  );
  assert.equal(
    state.equippedByTarget.get('portrait:character:axilin').assetInstanceId,
    'asset_2'
  );
});

test('[profile-asset-state] validates portrait equipment ownership and slot support', () => {
  assert.equal(profileAssetTargetKey(paidPortrait), 'portrait:character:axilin');
  assert.equal(validateProfileAssetEquipment({ asset: paidPortrait, instance: null }).issue.code, 'asset_not_owned');
  assert.equal(validateProfileAssetEquipment({
    asset: paidPortrait,
    instance: { id: 'asset_1', assetId: paidPortrait.assetId, status: 'active' }
  }).ok, true);
  assert.equal(validateProfileAssetEquipment({
    asset: { ...paidPortrait, slot: 'badge' },
    instance: { id: 'asset_1', assetId: paidPortrait.assetId, status: 'active' }
  }).issue.code, 'unsupported_equipment_slot');
  assert.equal(validateProfileAssetEquipment({
    asset: paidPortrait,
    instance: { id: 'asset_2', assetId: 'portrait.thalla.1', status: 'active' }
  }).issue.code, 'asset_not_owned');
  assert.equal(validateProfileAssetEquipment({
    asset: paidPortrait,
    instance: { id: 'asset_3', assetId: paidPortrait.assetId, status: 'burned' }
  }).issue.code, 'asset_not_owned');
  assert.equal(validateProfileAssetEquipment({
    asset: { ...paidPortrait, price: 0 },
    instance: null
  }).ok, true);
  assert.equal(validateProfileAssetEquipment({
    asset: { ...paidPortrait, price: 0 },
    instance: { id: 'asset_4', assetId: 'portrait.thalla.1', status: 'active' }
  }).assetInstanceId, null);
  assert.equal(validateProfileAssetEquipment({
    asset: { ...paidPortrait, price: null },
    instance: null
  }).issue.code, 'asset_not_owned');
});

test('[profile-asset-state] shapes purchase mutations and asset instance drafts', () => {
  assert.equal(profileAssetAcquisitionSource({ ...paidPortrait, price: 0 }), 'free');
  assert.equal(profileAssetAcquisitionSource(paidPortrait), 'direct_purchase');

  assert.deepEqual(createProfileAssetPurchaseSpendMutation(paidPortrait, {
    playerId: 'player_1',
    idempotencyKey: 'client_key'
  }), {
    playerId: 'player_1',
    currencyCode: 'soft_coin',
    amount: 500,
    reason: 'asset_purchase',
    sourceType: 'asset',
    sourceId: 'portrait.axilin.1',
    idempotencyKey: 'asset_purchase:portrait.axilin.1:client_key',
    metadata: {
      slot: 'portrait',
      targetType: 'character',
      targetId: 'axilin'
    }
  });

  const draft = createProfileAssetInstanceDraft({
    id: 'asset_1',
    playerId: 'player_1',
    assetId: 'portrait.axilin.1',
    acquisitionSource: 'direct_purchase',
    acquisitionSourceId: 'wtx_1',
    acquiredAt: '2026-07-04T12:00:00.000Z',
    metadata: { price: 500 }
  });
  assert.equal(draft.status, 'active');
  assert.equal(profileAssetInstanceDraftToRow(draft).metadata_json, '{"price":500}');
});

test('[profile-asset-state] shapes portrait variants over injected policy state', () => {
  const state = createProfileAssetState({
    instances: [{ id: 'asset_1', asset_id: paidPortrait.assetId, status: 'active' }]
  });
  assert.equal(profileAssetIsOwned(paidPortrait, state), true);

  assert.deepEqual(shapeProfileAssetVariant({
    variant: { id: '1', name: { en: 'Axilin Alt' }, path: '/portrait.png' },
    asset: paidPortrait,
    owned: profileAssetIsOwned(paidPortrait, state),
    active: true,
    policy: {
      acquisitionMode: 'both',
      purchaseAvailable: true,
      rollAvailable: true
    }
  }), {
    id: '1',
    name: { en: 'Axilin Alt' },
    path: '/portrait.png',
    assetId: 'portrait.axilin.1',
    price: 500,
    cost: 500,
    currencyCode: 'soft_coin',
    owned: true,
    unlocked: true,
    active: true,
    acquisitionMode: 'both',
    purchaseAvailable: true,
    rollAvailable: true,
    packId: 'season_1_portraits',
    rarity: 'rare'
  });
});
