import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shapeSupportAssetGrantResult,
  shapeSupportAssetRevokeResult,
  shapeSupportLookupResult,
  shapeSupportMutationResult,
  shapeSupportRunResetResult,
  shapeSupportWalletMutationResult
} from '../src/modules/support/index.js';

test('[support] shapes lookup bundles with counts, limits, mappers, and extra collections', () => {
  const result = shapeSupportLookupResult({
    query: 'player_1',
    limit: 25,
    players: [{ id: 'player_1', secret: 'hidden' }],
    walletTransactions: [{ id: 'tx_1' }, { id: 'tx_2' }],
    supportActions: [{ id: 'action_1' }, { id: 'action_2' }],
    collections: {
      providerEvents: [{ id: 'evt_1' }]
    }
  }, {
    includeCounts: true,
    collectionLimits: {
      supportActions: 1
    },
    mappers: {
      players: (player) => ({ id: player.id })
    }
  });

  assert.deepEqual(result, {
    query: 'player_1',
    limit: 25,
    players: [{ id: 'player_1' }],
    walletTransactions: [{ id: 'tx_1' }, { id: 'tx_2' }],
    supportActions: [{ id: 'action_2' }],
    providerEvents: [{ id: 'evt_1' }],
    counts: {
      players: 1,
      walletTransactions: 2,
      supportActions: 1,
      providerEvents: 1
    }
  });
});

test('[support] shapes support mutation result envelopes over local action rows', () => {
  const supportAction = { id: 'support_1', action: 'wallet_adjust' };
  assert.deepEqual(shapeSupportWalletMutationResult({
    transaction: { id: 'tx_1' },
    wallet: { balances: { soft_coin: 5 } },
    supportAction
  }), {
    transaction: { id: 'tx_1' },
    wallet: { balances: { soft_coin: 5 } },
    supportAction
  });
  assert.deepEqual(shapeSupportAssetGrantResult({
    assetId: 'portrait.ruby',
    instance: { id: 'inst_1' },
    alreadyOwned: 0,
    action: supportAction
  }), {
    assetId: 'portrait.ruby',
    instance: { id: 'inst_1' },
    alreadyOwned: false,
    supportAction
  });
  assert.deepEqual(shapeSupportAssetRevokeResult({
    revoked: { id: 'inst_1' },
    action: supportAction
  }, {
    supportActionKey: 'action'
  }), {
    revoked: { id: 'inst_1' },
    action: supportAction
  });
  assert.deepEqual(shapeSupportRunResetResult({
    run: { id: 'run_1' },
    supportAction
  }), {
    run: { id: 'run_1' },
    supportAction
  });
  assert.deepEqual(shapeSupportMutationResult({
    custom: true,
    action: supportAction
  }), {
    custom: true,
    supportAction
  });
});
