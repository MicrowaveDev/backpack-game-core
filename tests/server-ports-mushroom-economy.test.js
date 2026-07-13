import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMushroomAssetServicePort,
  createMushroomGachaAdminServicePort,
  createMushroomWalletServicePort,
  WALLET_CURRENCY_CODE
} from '@microwavedev/backpack-game-core/server/ports/mushroom/economy';

test('[server-port][mushroom economy] exposes the wallet service factory', () => {
  assert.equal(WALLET_CURRENCY_CODE, 'soft_coin');
  assert.equal(typeof createMushroomAssetServicePort, 'function');
  assert.equal(typeof createMushroomGachaAdminServicePort, 'function');
  assert.equal(typeof createMushroomWalletServicePort, 'function');
});

test('[server-port][mushroom economy] gacha admin service uses injected catalog and persistence providers', async () => {
  const queries = [];
  const port = createMushroomGachaAdminServicePort({
    query: async (sql) => {
      queries.push(sql);
      return { rows: [], rowCount: 0 };
    },
    withTransaction: async (work) => work({ query: async () => ({ rows: [], rowCount: 0 }) }),
    characterVariants: { hero: [] },
    createId: (prefix) => `${prefix}_1`,
    nowIso: () => '2026-01-01T00:00:00.000Z',
    getAssetCatalog: () => [],
    getRuntimeAssetCatalog: async () => [{
      assetId: 'portrait.hero.default',
      name: { en: 'Hero' },
      rarity: 'common',
      dropWeight: 100,
      price: 0,
      currencyCode: 'soft_coin'
    }],
    shapeAssetPack: (pack) => pack,
    validateAssetPack: () => ({ ok: true, errors: [], warnings: [] }),
    writePlanImage: async ({ seasonId, itemId, extension }) => ({
      imagePath: `/gacha-plan/${seasonId}/${itemId}.${extension}`
    }),
    deletePlanImage: async () => {},
    recordAdminAction: async (_client, input) => input
  });

  const catalog = await port.listGachaAdminCatalog();
  assert.equal(queries.length, 5);
  assert.deepEqual(catalog.planCharacters, [{ id: 'hero', label: 'Hero' }]);
  assert.equal(catalog.assetOptions[0].assetId, 'portrait.hero.default');
});

test('[server-port][mushroom economy] asset service shapes static portrait assets through injected providers', () => {
  const port = createMushroomAssetServicePort({
    query: async () => ({ rows: [], rowCount: 0 }),
    withTransaction: async (work) => work({ query: async () => ({ rows: [], rowCount: 0 }) }),
    PORTRAIT_VARIANTS: {
      thalla: [{ id: 'default', cost: 0, name: { en: 'Default' } }]
    },
    portraitVariantsForResponse: (variants) => variants,
    portraitUrl: (characterId, portraitId) => `/portraits/${characterId}/${portraitId}.png`,
    createId: (prefix) => `${prefix}_1`,
    nowIso: () => '2026-01-01T00:00:00.000Z',
    spendCurrency: async () => ({ id: 'tx_1' }),
    withWalletMutationLock: async (_playerId, work) => work(),
    withMutationClaim: async (_scope, _key, work) => work()
  });

  assert.equal(port.portraitAssetId('thalla', 'default'), 'portrait.thalla.default');
  assert.deepEqual(port.parsePortraitAssetId('portrait.thalla.default'), {
    mushroomId: 'thalla',
    portraitId: 'default'
  });
  assert.equal(port.getAssetCatalog()[0].path, '/portraits/thalla/default.png');
});

test('[server-port][mushroom economy] requires injected providers when used', async () => {
  const port = createMushroomWalletServicePort();
  await assert.rejects(
    () => port.getWalletState('player_1'),
    /requires withTransaction/
  );
});
