import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMushroomWalletServicePort,
  WALLET_CURRENCY_CODE
} from '@microwavedev/backpack-game-core/server/ports/mushroom/economy';

test('[server-port][mushroom economy] exposes the wallet service factory', () => {
  assert.equal(WALLET_CURRENCY_CODE, 'soft_coin');
  assert.equal(typeof createMushroomWalletServicePort, 'function');
});

test('[server-port][mushroom economy] requires injected providers when used', async () => {
  const port = createMushroomWalletServicePort();
  await assert.rejects(
    () => port.getWalletState('player_1'),
    /requires withTransaction/
  );
});
