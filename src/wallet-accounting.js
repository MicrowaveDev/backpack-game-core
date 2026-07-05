export const DEFAULT_WALLET_ACCOUNTING_CURRENCY_CODE = 'soft_coin';

export const WALLET_PURCHASE_STATUS = Object.freeze({
  PENDING: 'pending',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  REVERSED: 'reversed',
  CHARGEBACK: 'chargeback',
  DISPUTED: 'disputed',
  UNDERPAID: 'underpaid',
  OVERPAID: 'overpaid',
  CANCELLED: 'cancelled'
});

export const WALLET_PURCHASE_STATUSES = Object.freeze(Object.values(WALLET_PURCHASE_STATUS));
export const WALLET_PURCHASE_CLAWBACK_STATUSES = Object.freeze([
  WALLET_PURCHASE_STATUS.REFUNDED,
  WALLET_PURCHASE_STATUS.REVERSED,
  WALLET_PURCHASE_STATUS.CHARGEBACK
]);
export const WALLET_PURCHASE_REVIEW_STATUSES = Object.freeze([
  WALLET_PURCHASE_STATUS.DISPUTED,
  WALLET_PURCHASE_STATUS.UNDERPAID,
  WALLET_PURCHASE_STATUS.OVERPAID
]);
export const WALLET_PURCHASE_TERMINAL_NON_GRANT_STATUSES = Object.freeze([
  WALLET_PURCHASE_STATUS.EXPIRED,
  WALLET_PURCHASE_STATUS.FAILED,
  WALLET_PURCHASE_STATUS.CANCELLED
]);

const PURCHASE_STATUS_SET = new Set(WALLET_PURCHASE_STATUSES);
const CLAWBACK_STATUS_SET = new Set(WALLET_PURCHASE_CLAWBACK_STATUSES);
const REVIEW_STATUS_SET = new Set(WALLET_PURCHASE_REVIEW_STATUSES);
const TERMINAL_NON_GRANT_STATUS_SET = new Set(WALLET_PURCHASE_TERMINAL_NON_GRANT_STATUSES);

export function walletAccountingIssue(code, message) {
  return { code, message };
}

export function normalizeWalletCurrencyCode(
  currencyCode = DEFAULT_WALLET_ACCOUNTING_CURRENCY_CODE,
  { defaultCurrencyCode = DEFAULT_WALLET_ACCOUNTING_CURRENCY_CODE } = {}
) {
  const fallback = String(defaultCurrencyCode || DEFAULT_WALLET_ACCOUNTING_CURRENCY_CODE).trim()
    || DEFAULT_WALLET_ACCOUNTING_CURRENCY_CODE;
  return String(currencyCode || fallback).trim() || fallback;
}

export function normalizeWalletAmount(amount) {
  const value = Number(amount);
  return Number.isInteger(value) ? value : Number.NaN;
}

export function validateWalletDelta({
  delta,
  reason,
  currencyCode = DEFAULT_WALLET_ACCOUNTING_CURRENCY_CODE
} = {}, options = {}) {
  const errors = [];
  const normalizedDelta = normalizeWalletAmount(delta);
  const normalizedReason = String(reason || '').trim();
  const normalizedCurrencyCode = normalizeWalletCurrencyCode(currencyCode, options);

  if (!Number.isInteger(normalizedDelta) || normalizedDelta === 0) {
    errors.push(walletAccountingIssue('delta_invalid', 'Wallet delta must be a non-zero integer'));
  }
  if (!normalizedReason) {
    errors.push(walletAccountingIssue('reason_required', 'Wallet transaction reason is required'));
  }

  return {
    ok: errors.length === 0,
    errors,
    currencyCode: normalizedCurrencyCode,
    delta: normalizedDelta,
    reason: normalizedReason
  };
}

export function normalizeWalletGrantAmount(amount) {
  const value = normalizeWalletAmount(amount);
  return Number.isInteger(value) && value > 0 ? value : Number.NaN;
}

export function normalizeWalletSpendAmount(amount) {
  const value = normalizeWalletAmount(amount);
  return Number.isInteger(value) && value > 0 ? value : Number.NaN;
}

export function applyWalletBalanceDelta(balance, delta, { allowNegative = false } = {}) {
  const balanceBefore = Number(balance ?? 0);
  const normalizedDelta = normalizeWalletAmount(delta);
  if (!Number.isFinite(balanceBefore)) {
    return {
      ok: false,
      issue: walletAccountingIssue('balance_invalid', 'Wallet balance must be a finite number'),
      balanceBefore,
      delta: normalizedDelta,
      balanceAfter: balanceBefore
    };
  }
  if (!Number.isInteger(normalizedDelta) || normalizedDelta === 0) {
    return {
      ok: false,
      issue: walletAccountingIssue('delta_invalid', 'Wallet delta must be a non-zero integer'),
      balanceBefore,
      delta: normalizedDelta,
      balanceAfter: balanceBefore
    };
  }

  const balanceAfter = balanceBefore + normalizedDelta;
  if (!allowNegative && balanceAfter < 0) {
    return {
      ok: false,
      issue: walletAccountingIssue('insufficient_balance', 'Not enough wallet balance'),
      balanceBefore,
      delta: normalizedDelta,
      balanceAfter: balanceBefore
    };
  }
  return {
    ok: true,
    issue: null,
    balanceBefore,
    delta: normalizedDelta,
    balanceAfter
  };
}

export function createWalletTransactionDraft({
  id,
  playerId,
  currencyCode = DEFAULT_WALLET_ACCOUNTING_CURRENCY_CODE,
  delta,
  balanceAfter,
  reason,
  sourceType = null,
  sourceId = null,
  idempotencyKey = null,
  metadata = {},
  createdAt = null
} = {}) {
  const validation = validateWalletDelta({ currencyCode, delta, reason });
  return {
    id,
    playerId,
    currencyCode: validation.currencyCode,
    delta: validation.delta,
    balanceAfter: Number(balanceAfter ?? 0),
    reason: validation.reason,
    sourceType,
    sourceId,
    idempotencyKey,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    createdAt,
    validation
  };
}

export function normalizeWalletPurchaseStatus(status) {
  return String(status || '').trim();
}

export function isWalletPurchaseStatus(status) {
  return PURCHASE_STATUS_SET.has(normalizeWalletPurchaseStatus(status));
}

export function isWalletPurchaseClawbackStatus(status) {
  return CLAWBACK_STATUS_SET.has(normalizeWalletPurchaseStatus(status));
}

export function isWalletPurchaseReviewStatus(status) {
  return REVIEW_STATUS_SET.has(normalizeWalletPurchaseStatus(status));
}

export function isWalletPurchaseTerminalNonGrantStatus(status) {
  return TERMINAL_NON_GRANT_STATUS_SET.has(normalizeWalletPurchaseStatus(status));
}

export function canRecordWalletPurchaseStatus(status) {
  const normalized = normalizeWalletPurchaseStatus(status);
  return isWalletPurchaseStatus(normalized) &&
    normalized !== WALLET_PURCHASE_STATUS.PENDING &&
    normalized !== WALLET_PURCHASE_STATUS.COMPLETED;
}

export function classifyWalletPurchaseStatus(status) {
  const normalized = normalizeWalletPurchaseStatus(status);
  return {
    status: normalized,
    known: isWalletPurchaseStatus(normalized),
    pending: normalized === WALLET_PURCHASE_STATUS.PENDING,
    completed: normalized === WALLET_PURCHASE_STATUS.COMPLETED,
    clawback: isWalletPurchaseClawbackStatus(normalized),
    reviewRequired: isWalletPurchaseReviewStatus(normalized),
    terminalNonGrant: isWalletPurchaseTerminalNonGrantStatus(normalized),
    recordableProviderStatus: canRecordWalletPurchaseStatus(normalized)
  };
}

export function normalizeWalletPriceCurrency(currency) {
  const normalized = String(currency || '').trim().toUpperCase();
  return normalized || null;
}

export function walletPurchasePriceMatches({
  expectedAmount,
  expectedCurrency,
  receivedAmount = null,
  receivedCurrency = null
} = {}) {
  const normalizedExpectedAmount = Number(expectedAmount || 0);
  const normalizedReceivedAmount = receivedAmount == null
    ? normalizedExpectedAmount
    : Number(receivedAmount);
  const normalizedExpectedCurrency = normalizeWalletPriceCurrency(expectedCurrency);
  const normalizedReceivedCurrency = normalizeWalletPriceCurrency(receivedCurrency) || normalizedExpectedCurrency;
  return {
    ok: normalizedReceivedAmount === normalizedExpectedAmount &&
      normalizedReceivedCurrency === normalizedExpectedCurrency,
    expectedAmount: normalizedExpectedAmount,
    receivedAmount: normalizedReceivedAmount,
    expectedCurrency: normalizedExpectedCurrency,
    receivedCurrency: normalizedReceivedCurrency
  };
}

function readField(value, camelKey, snakeKey = null) {
  if (!value || typeof value !== 'object') return null;
  if (value[camelKey] != null) return value[camelKey];
  if (snakeKey && value[snakeKey] != null) return value[snakeKey];
  return null;
}

function parseWalletJsonField(value, fallback = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function walletPurchaseIntentMetadata(intent = {}) {
  const metadata = readField(intent, 'metadata', 'metadata_json');
  return parseWalletJsonField(metadata, {});
}

export function walletPurchaseIntentSnapshot(intent = {}) {
  return {
    id: readField(intent, 'id'),
    playerId: readField(intent, 'playerId', 'player_id'),
    provider: readField(intent, 'provider'),
    providerInvoiceId: readField(intent, 'providerInvoiceId', 'provider_invoice_id'),
    providerPaymentId: readField(intent, 'providerPaymentId', 'provider_payment_id'),
    currencyCode: normalizeWalletCurrencyCode(readField(intent, 'currencyCode', 'currency_code')),
    walletAmount: normalizeWalletAmount(readField(intent, 'walletAmount', 'wallet_amount')),
    priceAmount: Number(readField(intent, 'priceAmount', 'price_amount') ?? 0),
    priceCurrency: readField(intent, 'priceCurrency', 'price_currency'),
    status: normalizeWalletPurchaseStatus(readField(intent, 'status')),
    checkoutStatus: readField(intent, 'checkoutStatus', 'checkout_status'),
    checkoutClaimedAt: readField(intent, 'checkoutClaimedAt', 'checkout_claimed_at'),
    idempotencyKey: readField(intent, 'idempotencyKey', 'idempotency_key'),
    createdAt: readField(intent, 'createdAt', 'created_at'),
    updatedAt: readField(intent, 'updatedAt', 'updated_at'),
    completedAt: readField(intent, 'completedAt', 'completed_at')
  };
}

export function createWalletPurchaseIntentDraft({
  id,
  playerId,
  bundle = {},
  providerInvoiceId = null,
  idempotencyKey = null,
  metadata = {},
  status = WALLET_PURCHASE_STATUS.PENDING,
  createdAt = null,
  updatedAt = createdAt
} = {}) {
  return {
    id,
    playerId,
    provider: bundle.provider || null,
    providerInvoiceId,
    providerPaymentId: null,
    currencyCode: normalizeWalletCurrencyCode(bundle.currencyCode),
    walletAmount: normalizeWalletGrantAmount(bundle.walletAmount),
    priceAmount: Number(bundle.priceAmount || 0),
    priceCurrency: normalizeWalletPriceCurrency(bundle.priceCurrency),
    status: normalizeWalletPurchaseStatus(status) || WALLET_PURCHASE_STATUS.PENDING,
    checkoutStatus: null,
    checkoutClaimedAt: null,
    idempotencyKey,
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    createdAt,
    updatedAt,
    completedAt: null
  };
}

export function shapeWalletPurchaseCheckout(intent = {}, {
  coinLabel = 'wallet coins'
} = {}) {
  const snapshot = walletPurchaseIntentSnapshot(intent);
  const metadata = walletPurchaseIntentMetadata(intent);
  const storedCheckout = metadata.checkout && typeof metadata.checkout === 'object'
    ? metadata.checkout
    : {};
  if (snapshot.provider === 'telegram_stars') {
    return {
      type: 'telegram_invoice',
      provider: snapshot.provider,
      title: `${snapshot.walletAmount} ${coinLabel}`,
      description: `${snapshot.walletAmount} profile ${coinLabel}`,
      payload: snapshot.id,
      currency: snapshot.priceCurrency,
      prices: [
        { label: `${snapshot.walletAmount} ${coinLabel}`, amount: snapshot.priceAmount }
      ],
      ...storedCheckout
    };
  }
  return {
    type: 'crypto_invoice',
    provider: snapshot.provider,
    invoiceId: snapshot.providerInvoiceId,
    checkoutUrl: null,
    paymentUri: null,
    priceAmount: snapshot.priceAmount,
    priceCurrency: snapshot.priceCurrency,
    ...storedCheckout
  };
}

export function walletPurchaseCheckoutIsResolved(intent = {}) {
  const checkout = intent.checkout || shapeWalletPurchaseCheckout(intent);
  return Boolean(checkout?.invoiceReady || checkout?.setupRequired);
}

export function createWalletPurchaseCheckoutMetadataPatch(intent = {}, checkout = {}) {
  const snapshot = walletPurchaseIntentSnapshot(intent);
  const metadata = walletPurchaseIntentMetadata(intent);
  return {
    providerInvoiceId: checkout.providerInvoiceId || snapshot.providerInvoiceId,
    metadata: {
      ...metadata,
      checkout
    },
    checkoutStatus: 'ready',
    checkoutClaimToken: null,
    checkoutClaimedAt: null
  };
}

export function createWalletPurchaseCompletionPlan(intent = {}, {
  provider = null,
  providerPaymentId = null,
  priceAmount = null,
  priceCurrency = null,
  metadata = {}
} = {}) {
  const snapshot = walletPurchaseIntentSnapshot(intent);
  const status = classifyWalletPurchaseStatus(snapshot.status);
  if (status.completed) {
    return {
      action: 'already_completed',
      ok: true,
      intent: snapshot,
      transaction: null
    };
  }
  if (!status.pending) {
    return {
      action: 'not_pending',
      ok: false,
      intent: snapshot,
      reason: snapshot.status
    };
  }
  const priceCheck = walletPurchasePriceMatches({
    expectedAmount: snapshot.priceAmount,
    expectedCurrency: snapshot.priceCurrency,
    receivedAmount: priceAmount,
    receivedCurrency: priceCurrency
  });
  if (!priceCheck.ok) {
    return {
      action: 'price_mismatch',
      ok: false,
      intent: snapshot,
      priceCheck
    };
  }
  const paymentId = providerPaymentId || null;
  const currentMetadata = walletPurchaseIntentMetadata(intent);
  const completedMetadata = {
    ...currentMetadata,
    completion: metadata && typeof metadata === 'object' ? metadata : {}
  };
  const completedIntent = {
    ...snapshot,
    status: WALLET_PURCHASE_STATUS.COMPLETED,
    providerPaymentId: paymentId,
    metadata: completedMetadata
  };
  return {
    action: 'complete',
    ok: true,
    intent: snapshot,
    providerPaymentId: paymentId,
    metadata: completedMetadata,
    grantMutation: createWalletPurchaseGrantMutation(completedIntent, {
      provider,
      providerPaymentId: paymentId
    }),
    priceCheck
  };
}

export function createWalletPurchaseGrantMutation(intent, {
  provider = null,
  providerPaymentId = null,
  metadata = {}
} = {}) {
  const snapshot = walletPurchaseIntentSnapshot(intent);
  return {
    playerId: snapshot.playerId,
    currencyCode: snapshot.currencyCode,
    amount: snapshot.walletAmount,
    reason: 'wallet_purchase',
    sourceType: 'wallet_purchase_intent',
    sourceId: snapshot.id,
    idempotencyKey: `wallet_purchase:${snapshot.id}`,
    metadata: {
      ...metadata,
      provider: provider || snapshot.provider,
      providerInvoiceId: snapshot.providerInvoiceId,
      providerPaymentId: providerPaymentId || snapshot.providerPaymentId || null
    }
  };
}

export function createWalletPurchaseReversalMutation(intent, {
  provider = null,
  status,
  payload = {}
} = {}) {
  const snapshot = walletPurchaseIntentSnapshot(intent);
  return {
    playerId: snapshot.playerId,
    currencyCode: snapshot.currencyCode,
    amount: snapshot.walletAmount,
    reason: 'wallet_purchase_reversal',
    sourceType: 'wallet_purchase_intent',
    sourceId: snapshot.id,
    idempotencyKey: `wallet_purchase_reversal:${snapshot.id}:${normalizeWalletPurchaseStatus(status)}`,
    metadata: {
      provider: provider || snapshot.provider,
      status: normalizeWalletPurchaseStatus(status),
      providerInvoiceId: snapshot.providerInvoiceId,
      providerPaymentId: snapshot.providerPaymentId,
      payload
    }
  };
}

export function walletSettlementRequiresGrant(settlementStatus) {
  return normalizeWalletPurchaseStatus(settlementStatus) === WALLET_PURCHASE_STATUS.COMPLETED;
}

export function walletSettlementRequiresClawback(settlementStatus) {
  return isWalletPurchaseClawbackStatus(settlementStatus);
}

export function walletSettlementRequiresReview(settlementStatus) {
  return isWalletPurchaseReviewStatus(settlementStatus);
}

export function walletSettlementMatchesPurchaseStatus(settlementStatus, purchaseStatus) {
  const settlement = normalizeWalletPurchaseStatus(settlementStatus);
  const local = normalizeWalletPurchaseStatus(purchaseStatus);
  if (walletSettlementRequiresGrant(settlement)) return local === WALLET_PURCHASE_STATUS.COMPLETED;
  if (walletSettlementRequiresClawback(settlement)) return local === settlement;
  if (walletSettlementRequiresReview(settlement)) return local === settlement;
  if (isWalletPurchaseTerminalNonGrantStatus(settlement)) return local === settlement;
  return true;
}
