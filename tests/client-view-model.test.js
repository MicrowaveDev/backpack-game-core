import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assetPackAvailabilityLabel,
  assetPackIsActive,
  assetRollStatusFromError,
  artifactPreviewOrientation,
  bagRowEntryFor,
  classifyCell,
  formatAssetRollResultItemsText,
  formatArtifactBonusEntries,
  formatAssetPackRarityOdds,
  formatLoadoutStatsText,
  formatStatDelta,
  buildOccupiedCellMap,
  formatWalletBundlePrice,
  occupiedCellKeys,
  prepareGridProps,
  preferredArtifactOrientation,
  projectLoadoutItems,
  resolveWalletBalance,
  sumArtifactBonuses,
  summarizeAssetRollFeedback,
  summarizeWalletPurchaseSurface,
  summarizeAssetRollPacks,
  walletPurchaseStatusFromIntent,
  walletPurchaseStatusFromTelegramInvoice
} from '@microwavedev/backpack-game-core/client-view-model';

const bagIds = new Set(['starter_bag', 'pouch']);
const artifacts = new Map([
  ['starter_bag', { id: 'starter_bag', family: 'bag', width: 3, height: 3, color: '#d4c9a8' }],
  ['pouch', { id: 'pouch', family: 'bag', width: 1, height: 2, color: '#6b8f5e' }],
  ['needle', { id: 'needle', family: 'damage', width: 1, height: 1 }],
  ['blade', { id: 'blade', family: 'damage', width: 2, height: 1 }]
]);

function row(overrides) {
  return {
    id: 'row',
    artifactId: 'needle',
    x: -1,
    y: -1,
    width: 1,
    height: 1,
    active: false,
    rotated: false,
    freshPurchase: false,
    ...overrides
  };
}

test('[client-view-model] projects flat loadout rows into UI buckets', () => {
  const result = projectLoadoutItems([
    row({ id: 'starter', artifactId: 'starter_bag', x: 1, y: 1, active: true, freshPurchase: true }),
    row({ id: 'rotated', artifactId: 'pouch', x: 4, y: 1, active: true, rotated: 1 }),
    row({ id: 'needle', artifactId: 'needle', x: 2, y: 1 }),
    row({ id: 'blade', artifactId: 'blade' })
  ], bagIds, artifacts);

  assert.deepEqual(result.activeBags.map((bag) => [bag.id, bag.anchorX, bag.anchorY]), [
    ['starter', 1, 1],
    ['rotated', 4, 1]
  ]);
  assert.deepEqual(result.rotatedBags, [{ id: 'rotated', artifactId: 'pouch', rotation: 1 }]);
  assert.deepEqual(result.builderItems.map((item) => item.id), ['needle']);
  assert.deepEqual(result.containerItems.map((item) => item.id), ['blade']);
  assert.deepEqual(result.freshPurchases, ['starter_bag']);
});

test('[client-view-model] prepares grid props with configurable dimensions', () => {
  const result = prepareGridProps([
    row({ id: 'starter', artifactId: 'starter_bag', x: 1, y: 1, active: true }),
    row({ id: 'needle', artifactId: 'needle', x: 2, y: 1 })
  ], bagIds, artifacts, { columns: 6, minRows: 6 });

  assert.deepEqual(result.items.map((item) => item.id), ['needle']);
  assert.ok(result.bagRows.some((bagRow) => bagRow.artifactId === 'starter_bag' && bagRow.row === 1));
  assert.equal(result.totalRows, 6);
});

function bagRow({ artifactId = 'moss_pouch', row: y, anchorX, cols, enabledXs, color = '#6b8f5e' }) {
  return {
    row: y,
    artifactId,
    color,
    enabledCells: enabledXs,
    bboxStart: anchorX,
    bboxEnd: anchorX + cols
  };
}

test('[client-view-model] classifies grid cells with slot-first bag lookup', () => {
  const baseRect = { cols: 3, rows: 3 };
  assert.equal(classifyCell([
    bagRow({ row: 0, anchorX: 0, cols: 3, enabledXs: [0, 1, 2] })
  ], 0, 0, baseRect), 'base-inv');

  const rectangular = [bagRow({ row: 0, anchorX: 3, cols: 2, enabledXs: [3, 4] })];
  assert.equal(classifyCell(rectangular, 3, 0, baseRect), 'bag-slot');
  assert.equal(classifyCell(rectangular, 5, 0, baseRect), 'bag-empty');

  const shaped = [
    bagRow({ artifactId: 'spiral_cap', row: 0, anchorX: 3, cols: 3, enabledXs: [3, 4], color: '#b85a6e' }),
    bagRow({ artifactId: 'spiral_cap', row: 1, anchorX: 3, cols: 3, enabledXs: [4, 5], color: '#b85a6e' })
  ];
  assert.equal(classifyCell(shaped, 5, 0, baseRect), 'bag-box');
  assert.equal(classifyCell(shaped, 5, 1, baseRect), 'bag-slot');

  const overlapping = [
    bagRow({ artifactId: 'spiral_cap', row: 0, anchorX: 3, cols: 3, enabledXs: [3, 4], color: '#b85a6e' }),
    bagRow({ artifactId: 'mycelium_vine', row: 0, anchorX: 5, cols: 1, enabledXs: [5], color: '#6e9bbf' })
  ];
  assert.equal(classifyCell(overlapping, 5, 0, baseRect), 'bag-slot');
  assert.equal(bagRowEntryFor(overlapping, 5, 0).artifactId, 'mycelium_vine');
  assert.equal(bagRowEntryFor(overlapping, 0, 5), null);
});

test('[client-view-model] reports occupied artifact footprint cells', () => {
  const occupied = occupiedCellKeys([
    { artifactId: 'static_spore_sac', x: 3, y: 2, width: 1, height: 2 },
    { artifactId: 'thunder_gill', x: 0, y: 4, width: 2, height: 1 },
    { artifactId: 'bad_position', x: null, y: 5, width: 2, height: 1 }
  ]);

  assert.ok(occupied.has('3:2'));
  assert.ok(occupied.has('3:3'));
  assert.ok(occupied.has('0:4'));
  assert.ok(occupied.has('1:4'));
  assert.equal(occupied.has('4:2'), false);
});

test('[client-view-model] maps occupied cells to artifact values and derives preview orientation', () => {
  const occupied = buildOccupiedCellMap([
    { artifactId: 'static_spore_sac', x: 3, y: 2, width: 1, height: 2 },
    { artifactId: 'thunder_gill', x: 0, y: 4, width: 2, height: 1 }
  ]);

  assert.equal(occupied.get('3:2'), 'static_spore_sac');
  assert.equal(occupied.get('3:3'), 'static_spore_sac');
  assert.equal(occupied.get('1:4'), 'thunder_gill');
  assert.equal(occupied.has('4:2'), false);
  assert.deepEqual(preferredArtifactOrientation({ width: 1, height: 2 }), { width: 2, height: 1 });
  assert.deepEqual(artifactPreviewOrientation({ family: 'damage', width: 1, height: 2 }), { width: 1, height: 2 });
  assert.deepEqual(artifactPreviewOrientation({ family: 'bag', width: 1, height: 2 }), { width: 2, height: 1 });
  assert.deepEqual(preferredArtifactOrientation({
    width: 4,
    height: 1,
    shape: [[1], [1], [1], [1]]
  }), { width: 1, height: 4 });
});

test('[client-view-model] sums and formats artifact stat bonuses', () => {
  const statArtifacts = [
    { id: 'needle', bonus: { damage: 2, armor: 0, speed: -1 } },
    { id: 'plate', bonus: { armor: 3, stunChance: 5 } },
    { id: 'empty', bonus: { damage: 'bad' } }
  ];
  const statKeys = ['damage', 'armor', 'speed', 'stunChance'];

  const totals = sumArtifactBonuses([
    { artifactId: 'needle' },
    { artifactId: 'plate' },
    { artifactId: 'missing' },
    { artifactId: 'empty' }
  ], statArtifacts, { statKeys });

  assert.deepEqual(totals, {
    damage: 2,
    armor: 3,
    speed: -1,
    stunChance: 5
  });
  assert.equal(formatStatDelta(null), '');
  assert.equal(formatStatDelta(Number.NaN), '');
  assert.equal(formatStatDelta(0), '0');
  assert.equal(formatStatDelta(3), '+3');
  assert.equal(formatStatDelta(-1), '-1');
  assert.equal(formatStatDelta(5, { suffix: '%' }), '+5%');

  assert.deepEqual(formatArtifactBonusEntries({
    bonus: { damage: 2, armor: -1, speed: 0, stunChance: 5 }
  }, {
    labels: { damage: 'Damage', armor: 'Armor', speed: 'Speed', stunChance: 'Stun' },
    statKeys
  }), [
    { key: 'damage', label: 'Damage', value: '+2', numericValue: 2, positive: true },
    { key: 'armor', label: 'Armor', value: '-1', numericValue: -1, positive: false },
    { key: 'stunChance', label: 'Stun', value: '+5%', numericValue: 5, positive: true }
  ]);
  assert.equal(formatLoadoutStatsText({
    totals,
    labels: { damage: 'Damage', armor: 'Armor', speed: 'Speed', stunChance: 'Stun' },
    statKeys
  }), 'Damage +2 / Armor +3 / Speed -1 / Stun +5%');
  assert.equal(formatLoadoutStatsText({
    items: [{ artifactId: 'plate' }],
    artifacts: new Map(statArtifacts.map((artifact) => [artifact.id, artifact])),
    labels: { armor: 'Armor', stunChance: 'Stun' },
    statKeys: ['armor', 'stunChance'],
    suffixByKey: {}
  }), 'Armor +3 / Stun +5');
});

test('[client-view-model] formats asset pack odds and availability labels', () => {
  const pack = {
    id: 'starter_pack',
    availability: 'active',
    raritySummary: [
      { rarity: 'common', probability: 0.75 },
      { rarity: 'rare', probability: 0.25 }
    ]
  };
  const rarityLabel = (rarity) => ({ common: 'Common', rare: 'Rare' }[rarity] || rarity);

  assert.equal(formatAssetPackRarityOdds(pack, { rarityLabel }), 'Common 75% · Rare 25%');
  assert.equal(assetPackIsActive(pack), true);
  assert.equal(assetPackAvailabilityLabel({ ...pack, availability: 'future' }, {
    labels: { future: 'Pack opens later.' }
  }), 'Pack opens later.');
});

test('[client-view-model] summarizes roll pack state for asset UIs', () => {
  const summaries = summarizeAssetRollPacks({
    portraits: [
      { assetId: 'skin.a', packId: 'starter_pack', unlocked: false, rollAvailable: true },
      { assetId: 'skin.c', unlocked: true }
    ],
    packs: [
      {
        id: 'starter_pack',
        name: { en: 'Starter Pack' },
        availability: 'active',
        rollPriceAmount: 50,
        rollSize: 2,
        totalItems: 2,
        ownedCount: 1,
        remainingCount: 1,
        raritySummary: [
          { rarity: 'common', probability: 0.75 },
          { rarity: 'rare', probability: 0.25 }
        ],
        duplicatePolicy: { enabled: true },
        duplicateCopies: 3,
        burn: { rules: [{ id: 'burn_common', ready: true, sourceCount: 5, sourceRarity: 'common' }] },
        guarantees: { rules: [{ minRarity: 'rare', count: 1 }] },
        pity: { rules: [{ minRarity: 'epic', threshold: 5, remaining: 1, active: false }] },
        items: [
          { assetId: 'skin.a', rarity: 'common', dropWeight: 75 },
          { assetId: 'skin.b', rarity: 'rare', dropWeight: 25 }
        ]
      }
    ],
    packName: (pack) => pack.name.en,
    rarityLabel: (rarity) => ({ common: 'Common', rare: 'Rare', epic: 'Epic' }[rarity] || rarity),
    labels: {
      guaranteeTemplate: 'Guarantee: {count} {rarity}+',
      pityTemplate: '{rarity}+ pity in {count} opens',
      pityReadyTemplate: '{rarity}+ guaranteed next open',
      duplicateTemplate: 'Duplicates: {count}'
    }
  });

  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].name, 'Starter Pack');
  assert.equal(summaries[0].canRoll, true);
  assert.equal(summaries[0].canBurn, true);
  assert.equal(summaries[0].nextRollItemCount, 2);
  assert.equal(summaries[0].odds, 'Common 75% · Rare 25%');
  assert.equal(summaries[0].guaranteeText, 'Guarantee: 1 Rare+');
  assert.equal(summaries[0].pityText, 'Epic+ pity in 1 opens');
  assert.equal(summaries[0].duplicateText, 'Duplicates: 3');
  assert.equal(summaries[0].burnRarity, 'Common');
});

test('[client-view-model] summarizes wallet purchase surfaces', () => {
  const summary = summarizeWalletPurchaseSurface({
    wallet: { balances: { soft_coin: 125 } },
    player: { spore: 10 },
    bundles: [
      { id: 'coins_small', provider: 'btcpay', priceAmount: 500, priceCurrency: 'USD' },
      { id: 'stars_small', provider: 'telegram_stars', priceAmount: 50, priceCurrency: 'XTR' }
    ],
    bundleSurface: 'web',
    surface: 'web',
    status: 'opened',
    support: {
      supportUrl: 'https://support.example/pay',
      termsUrl: 'https://terms.example/pay'
    },
    labels: {
      support: 'Support',
      terms: 'Terms',
      status: { opened: 'Checkout opened.' }
    }
  });

  assert.equal(resolveWalletBalance({ player: { spore: 10 } }), 10);
  assert.equal(summary.balance, 125);
  assert.equal(summary.bundles.length, 2);
  assert.equal(summary.statusText, 'Checkout opened.');
  assert.deepEqual(summary.supportEntries, [
    { label: 'Support', url: 'https://support.example/pay' },
    { label: 'Terms', url: 'https://terms.example/pay' }
  ]);
  assert.equal(formatWalletBundlePrice(summary.bundles[0]), '$5.00');
  assert.equal(formatWalletBundlePrice(summary.bundles[1]), '50 XTR');
});

test('[client-view-model] normalizes wallet and asset-roll client statuses', () => {
  assert.equal(walletPurchaseStatusFromIntent({ status: 'completed' }), 'confirmed');
  assert.equal(walletPurchaseStatusFromIntent({ checkoutStatus: 'expired' }), 'expired');
  assert.equal(walletPurchaseStatusFromIntent({ status: 'reversed' }), 'failed');
  assert.equal(walletPurchaseStatusFromIntent({ status: 'open' }), '');
  assert.equal(walletPurchaseStatusFromIntent({ status: 'done' }, { completedStatus: 'DONE' }), 'confirmed');

  assert.equal(walletPurchaseStatusFromTelegramInvoice('paid'), 'confirmed');
  assert.equal(walletPurchaseStatusFromTelegramInvoice('pending'), 'pending');
  assert.equal(walletPurchaseStatusFromTelegramInvoice('expired'), 'expired');
  assert.equal(walletPurchaseStatusFromTelegramInvoice('cancelled'), 'failed');
  assert.equal(walletPurchaseStatusFromTelegramInvoice('unknown'), 'failed');

  assert.equal(assetRollStatusFromError(new Error('No unowned assets left')), 'complete');
  assert.equal(assetRollStatusFromError(new Error('No rollable assets in this pack')), 'complete');
  assert.equal(assetRollStatusFromError(new Error('Duplicate assets are unavailable')), 'burn_unavailable');
  assert.equal(assetRollStatusFromError(new Error('Not enough soft_coin')), 'insufficient');
  assert.equal(assetRollStatusFromError(new Error('Gacha is disabled')), 'disabled');
  assert.equal(assetRollStatusFromError(new Error('Pack is inactive')), 'unavailable');
  assert.equal(assetRollStatusFromError(new Error('Configuration is invalid')), 'invalid');
  assert.equal(assetRollStatusFromError(new Error('Unexpected failure')), 'failed');
});

test('[client-view-model] summarizes asset roll feedback', () => {
  const localizeName = (value) => value?.en || value || '';
  const rarityLabel = (rarity) => ({ common: 'Common', rare: 'Rare', epic: 'Epic' }[rarity] || rarity);
  const labels = {
    openingTitle: 'Opening pack',
    openingText: 'Rolling...',
    burnOpeningTitle: 'Trading duplicates',
    burnOpeningText: 'Burning spare copies.',
    multiResultTitleTemplate: '{count} skins unlocked',
    resultTitle: 'New skin unlocked',
    resultTemplate: '{asset} · {rarity}',
    burnResultTitle: 'Exchange complete',
    burnResultTemplate: '{asset} · {rarity}',
    problemTitle: 'Pack not opened',
    errors: { complete: 'Every skin is already owned.' }
  };

  assert.deepEqual(summarizeAssetRollFeedback({ status: 'rolling', labels }), {
    status: 'rolling',
    title: 'Opening pack',
    text: 'Rolling...'
  });
  assert.deepEqual(summarizeAssetRollFeedback({
    status: 'success',
    result: { assetName: { en: 'Mooncap' }, assetId: 'skin.a', rarity: 'rare' },
    labels,
    localizeName,
    rarityLabel
  }), {
    status: 'success',
    title: 'New skin unlocked',
    text: 'Mooncap · Rare'
  });
  assert.equal(formatAssetRollResultItemsText({
    items: [
      { assetName: { en: 'Mooncap' }, rarity: 'rare' },
      { assetName: { en: 'Amber Veil' }, rarity: 'common' },
      { assetName: { en: 'Spore Crown' }, rarity: 'epic' },
      { assetName: { en: 'Night Bloom' }, rarity: 'rare' }
    ]
  }, { localizeName, rarityLabel }), 'Mooncap · Rare | Amber Veil · Common | Spore Crown · Epic +1');
  assert.deepEqual(summarizeAssetRollFeedback({
    status: 'complete',
    errorMessage: 'No assets left',
    labels
  }), {
    status: 'complete',
    title: 'Pack not opened',
    text: 'Every skin is already owned.'
  });
  assert.equal(summarizeAssetRollFeedback({ status: 'success', labels }), null);
});
