import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assetPackAvailabilityLabel,
  assetPackIsActive,
  formatAssetRollResultItemsText,
  formatAssetPackRarityOdds,
  formatWalletBundlePrice,
  prepareGridProps,
  projectLoadoutItems,
  resolveWalletBalance,
  summarizeAssetRollFeedback,
  summarizeWalletPurchaseSurface,
  summarizeAssetRollPacks
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
