import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMushroomAssetServicePort,
  createMushroomWalletServicePort,
  WALLET_CURRENCY_CODE
} from '@microwavedev/backpack-game-core/server/ports/mushroom/economy';

test('[server-port][mushroom economy] exposes the wallet service factory', () => {
  assert.equal(WALLET_CURRENCY_CODE, 'soft_coin');
  assert.equal(typeof createMushroomAssetServicePort, 'function');
  assert.equal(typeof createMushroomWalletServicePort, 'function');
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
