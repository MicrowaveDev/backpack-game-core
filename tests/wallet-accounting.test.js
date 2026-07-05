import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyWalletBalanceDelta,
  canRecordWalletPurchaseStatus,
  classifyWalletPurchaseStatus,
  createWalletPurchaseCheckoutMetadataPatch,
  createWalletPurchaseCompletionPlan,
  createWalletPurchaseGrantMutation,
  createWalletPurchaseIntentDraft,
  createWalletPurchaseReversalMutation,
  createWalletTransactionDraft,
  normalizeWalletCurrencyCode,
  normalizeWalletGrantAmount,
  normalizeWalletSpendAmount,
  validateWalletDelta,
  walletPurchaseIntentSnapshot,
  shapeWalletPurchaseCheckout,
  walletPurchaseCheckoutIsResolved,
  walletPurchasePriceMatches,
  walletSettlementMatchesPurchaseStatus,
  walletSettlementRequiresClawback,
  walletSettlementRequiresGrant,
  walletSettlementRequiresReview
} from '@microwavedev/backpack-game-core/wallet-accounting';

test('[wallet-accounting] validates wallet deltas and positive grant/spend amounts', () => {
  assert.equal(normalizeWalletCurrencyCode(''), 'soft_coin');
  assert.equal(normalizeWalletCurrencyCode(' gems '), 'gems');
  assert.equal(normalizeWalletGrantAmount(10), 10);
  assert.equal(Number.isNaN(normalizeWalletGrantAmount(0)), true);
  assert.equal(normalizeWalletSpendAmount(3), 3);
  assert.equal(Number.isNaN(normalizeWalletSpendAmount(-1)), true);

  const valid = validateWalletDelta({
    currencyCode: ' soft_coin ',
    delta: -5,
    reason: 'asset_purchase'
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.currencyCode, 'soft_coin');
  assert.equal(valid.delta, -5);

  const invalid = validateWalletDelta({ delta: 0, reason: '' });
  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.errors.map((issue) => issue.code), ['delta_invalid', 'reason_required']);
});

test('[wallet-accounting] applies balance deltas without allowing negative balances by default', () => {
  assert.deepEqual(applyWalletBalanceDelta(20, 5), {
    ok: true,
    issue: null,
    balanceBefore: 20,
    delta: 5,
    balanceAfter: 25
  });

  const insufficient = applyWalletBalanceDelta(3, -5);
  assert.equal(insufficient.ok, false);
  assert.equal(insufficient.issue.code, 'insufficient_balance');
  assert.equal(insufficient.balanceAfter, 3);

  const overdraft = applyWalletBalanceDelta(3, -5, { allowNegative: true });
  assert.equal(overdraft.ok, true);
  assert.equal(overdraft.balanceAfter, -2);
});

test('[wallet-accounting] shapes transaction drafts and purchase mutations over plain rows', () => {
  const draft = createWalletTransactionDraft({
    id: 'wtx_1',
    playerId: 'player_1',
    delta: 100,
    balanceAfter: 120,
    reason: 'wallet_purchase',
    sourceType: 'wallet_purchase_intent',
    sourceId: 'intent_1',
    idempotencyKey: 'wallet_purchase:intent_1',
    createdAt: '2026-07-04T12:00:00.000Z'
  });
  assert.equal(draft.validation.ok, true);
  assert.equal(draft.balanceAfter, 120);
  assert.deepEqual(draft.metadata, {});

  const snakeRow = {
    id: 'intent_1',
    player_id: 'player_1',
    provider: 'btcpay',
    provider_invoice_id: 'invoice_1',
    provider_payment_id: 'payment_1',
    currency_code: 'soft_coin',
    wallet_amount: 100,
    price_amount: 100,
    price_currency: 'USD',
    status: 'completed'
  };
  assert.deepEqual(walletPurchaseIntentSnapshot(snakeRow), {
    id: 'intent_1',
    playerId: 'player_1',
    provider: 'btcpay',
    providerInvoiceId: 'invoice_1',
    providerPaymentId: 'payment_1',
    currencyCode: 'soft_coin',
    walletAmount: 100,
    priceAmount: 100,
    priceCurrency: 'USD',
    status: 'completed',
    checkoutStatus: null,
    checkoutClaimedAt: null,
    idempotencyKey: null,
    createdAt: null,
    updatedAt: null,
    completedAt: null
  });

  assert.deepEqual(createWalletPurchaseGrantMutation(snakeRow, {
    provider: 'btcpay',
    providerPaymentId: 'payment_2'
  }), {
    playerId: 'player_1',
    currencyCode: 'soft_coin',
    amount: 100,
    reason: 'wallet_purchase',
    sourceType: 'wallet_purchase_intent',
    sourceId: 'intent_1',
    idempotencyKey: 'wallet_purchase:intent_1',
    metadata: {
      provider: 'btcpay',
      providerInvoiceId: 'invoice_1',
      providerPaymentId: 'payment_2'
    }
  });

  assert.deepEqual(createWalletPurchaseReversalMutation(snakeRow, {
    provider: 'btcpay',
    status: 'refunded',
    payload: { eventId: 'refund_1' }
  }), {
    playerId: 'player_1',
    currencyCode: 'soft_coin',
    amount: 100,
    reason: 'wallet_purchase_reversal',
    sourceType: 'wallet_purchase_intent',
    sourceId: 'intent_1',
    idempotencyKey: 'wallet_purchase_reversal:intent_1:refunded',
    metadata: {
      provider: 'btcpay',
      status: 'refunded',
      providerInvoiceId: 'invoice_1',
      providerPaymentId: 'payment_1',
      payload: { eventId: 'refund_1' }
    }
  });
});

test('[wallet-accounting] plans purchase intent drafts and checkout DTOs', () => {
  const draft = createWalletPurchaseIntentDraft({
    id: 'intent_2',
    playerId: 'player_2',
    bundle: {
      id: 'coins_small',
      provider: 'telegram_stars',
      currencyCode: 'soft_coin',
      walletAmount: 100,
      priceAmount: 1,
      priceCurrency: 'xtr'
    },
    providerInvoiceId: 'invoice_2',
    idempotencyKey: 'idem-2',
    metadata: { bundleId: 'coins_small' },
    createdAt: '2026-07-05T00:00:00.000Z'
  });

  assert.equal(draft.status, 'pending');
  assert.equal(draft.priceCurrency, 'XTR');
  assert.equal(draft.metadata.bundleId, 'coins_small');

  const checkout = shapeWalletPurchaseCheckout(draft);
  assert.equal(checkout.type, 'telegram_invoice');
  assert.equal(checkout.payload, 'intent_2');
  assert.equal(checkout.prices[0].amount, 1);
  assert.equal(walletPurchaseCheckoutIsResolved({ ...draft, checkout: { invoiceReady: true } }), true);

  const patch = createWalletPurchaseCheckoutMetadataPatch(draft, {
    invoiceReady: true,
    providerInvoiceId: 'provider-invoice-2',
    invoiceLink: 'https://t.me/invoice/test'
  });
  assert.equal(patch.providerInvoiceId, 'provider-invoice-2');
  assert.equal(patch.checkoutStatus, 'ready');
  assert.equal(patch.metadata.checkout.invoiceReady, true);

  const cryptoCheckout = shapeWalletPurchaseCheckout({
    ...draft,
    provider: 'btcpay',
    priceCurrency: 'USD',
    priceAmount: 500,
    metadata: {
      checkout: {
        invoiceReady: true,
        checkoutUrl: 'https://btcpay.example/i/1'
      }
    }
  });
  assert.equal(cryptoCheckout.type, 'crypto_invoice');
  assert.equal(cryptoCheckout.checkoutUrl, 'https://btcpay.example/i/1');
});

test('[wallet-accounting] plans purchase completion grants without provider SDKs', () => {
  const pendingIntent = {
    id: 'intent_3',
    player_id: 'player_3',
    provider: 'btcpay',
    provider_invoice_id: 'invoice_3',
    currency_code: 'soft_coin',
    wallet_amount: 550,
    price_amount: 500,
    price_currency: 'USD',
    status: 'pending',
    metadata_json: JSON.stringify({ bundleId: 'coins_medium' })
  };
  const plan = createWalletPurchaseCompletionPlan(pendingIntent, {
    provider: 'btcpay',
    providerPaymentId: 'payment_3',
    priceAmount: 500,
    priceCurrency: 'usd',
    metadata: { deliveryId: 'event_3' }
  });

  assert.equal(plan.action, 'complete');
  assert.equal(plan.ok, true);
  assert.equal(plan.metadata.completion.deliveryId, 'event_3');
  assert.deepEqual(plan.grantMutation, {
    playerId: 'player_3',
    currencyCode: 'soft_coin',
    amount: 550,
    reason: 'wallet_purchase',
    sourceType: 'wallet_purchase_intent',
    sourceId: 'intent_3',
    idempotencyKey: 'wallet_purchase:intent_3',
    metadata: {
      provider: 'btcpay',
      providerInvoiceId: 'invoice_3',
      providerPaymentId: 'payment_3'
    }
  });

  assert.equal(createWalletPurchaseCompletionPlan({
    ...pendingIntent,
    status: 'completed'
  }).action, 'already_completed');
  assert.equal(createWalletPurchaseCompletionPlan({
    ...pendingIntent,
    status: 'expired'
  }).action, 'not_pending');
  assert.equal(createWalletPurchaseCompletionPlan(pendingIntent, {
    priceAmount: 501,
    priceCurrency: 'USD'
  }).action, 'price_mismatch');
});

test('[wallet-accounting] classifies purchase statuses and settlement invariants', () => {
  assert.equal(canRecordWalletPurchaseStatus('refunded'), true);
  assert.equal(canRecordWalletPurchaseStatus('completed'), false);
  assert.deepEqual(classifyWalletPurchaseStatus('underpaid'), {
    status: 'underpaid',
    known: true,
    pending: false,
    completed: false,
    clawback: false,
    reviewRequired: true,
    terminalNonGrant: false,
    recordableProviderStatus: true
  });

  assert.equal(walletSettlementRequiresGrant('completed'), true);
  assert.equal(walletSettlementRequiresClawback('chargeback'), true);
  assert.equal(walletSettlementRequiresReview('disputed'), true);
  assert.equal(walletSettlementMatchesPurchaseStatus('completed', 'completed'), true);
  assert.equal(walletSettlementMatchesPurchaseStatus('completed', 'pending'), false);
  assert.equal(walletSettlementMatchesPurchaseStatus('refunded', 'refunded'), true);
  assert.equal(walletSettlementMatchesPurchaseStatus('refunded', 'completed'), false);
  assert.equal(walletSettlementMatchesPurchaseStatus('unknown_provider_status', 'pending'), true);
});

test('[wallet-accounting] compares purchase prices with default received values', () => {
  assert.deepEqual(walletPurchasePriceMatches({
    expectedAmount: 100,
    expectedCurrency: 'usd'
  }), {
    ok: true,
    expectedAmount: 100,
    receivedAmount: 100,
    expectedCurrency: 'USD',
    receivedCurrency: 'USD'
  });

  assert.equal(walletPurchasePriceMatches({
    expectedAmount: 100,
    expectedCurrency: 'USD',
    receivedAmount: '101',
    receivedCurrency: 'usd'
  }).ok, false);
});
