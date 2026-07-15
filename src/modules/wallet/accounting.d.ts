export const DEFAULT_WALLET_ACCOUNTING_CURRENCY_CODE: 'soft_coin';

export const WALLET_PURCHASE_STATUS: Readonly<{
  PENDING: 'pending';
  COMPLETED: 'completed';
  EXPIRED: 'expired';
  FAILED: 'failed';
  REFUNDED: 'refunded';
  REVERSED: 'reversed';
  CHARGEBACK: 'chargeback';
  DISPUTED: 'disputed';
  UNDERPAID: 'underpaid';
  OVERPAID: 'overpaid';
  CANCELLED: 'cancelled';
}>;

export const WALLET_PURCHASE_STATUSES: readonly string[];
export const WALLET_PURCHASE_CLAWBACK_STATUSES: readonly string[];
export const WALLET_PURCHASE_REVIEW_STATUSES: readonly string[];
export const WALLET_PURCHASE_TERMINAL_NON_GRANT_STATUSES: readonly string[];

export interface WalletAccountingIssue {
  code: string;
  message: string;
}

export interface WalletDeltaValidation {
  ok: boolean;
  errors: WalletAccountingIssue[];
  currencyCode: string;
  delta: number;
  reason: string;
}

export interface WalletBalanceDeltaResult {
  ok: boolean;
  issue: WalletAccountingIssue | null;
  balanceBefore: number;
  delta: number;
  balanceAfter: number;
}

export interface WalletTransactionDraft {
  id?: string | null;
  playerId?: string | null;
  currencyCode: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  sourceType: string | null;
  sourceId: string | null;
  idempotencyKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  validation: WalletDeltaValidation;
}

export interface WalletPurchaseStatusClassification {
  status: string;
  known: boolean;
  pending: boolean;
  completed: boolean;
  clawback: boolean;
  reviewRequired: boolean;
  terminalNonGrant: boolean;
  recordableProviderStatus: boolean;
}

export interface WalletPurchasePriceMatch {
  ok: boolean;
  expectedAmount: number;
  receivedAmount: number;
  expectedCurrency: string | null;
  receivedCurrency: string | null;
}

export interface WalletPurchaseIntentSnapshot {
  id: string | null;
  playerId: string | null;
  provider: string | null;
  providerInvoiceId: string | null;
  providerPaymentId: string | null;
  currencyCode: string;
  walletAmount: number;
  priceAmount: number;
  priceCurrency: string | null;
  status: string;
  checkoutStatus: string | null;
  checkoutClaimedAt: string | null;
  idempotencyKey: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
}

export interface WalletMutationParams {
  playerId: string | null;
  currencyCode: string;
  amount: number;
  reason: string;
  sourceType: string;
  sourceId: string | null;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
}

export function walletAccountingIssue(code: string, message: string): WalletAccountingIssue;
export function normalizeWalletCurrencyCode(
  currencyCode?: unknown,
  options?: { defaultCurrencyCode?: string }
): string;
export function normalizeWalletAmount(amount: unknown): number;
export function validateWalletDelta(
  input?: { delta?: unknown; reason?: unknown; currencyCode?: unknown },
  options?: { defaultCurrencyCode?: string }
): WalletDeltaValidation;
export function normalizeWalletGrantAmount(amount: unknown): number;
export function normalizeWalletSpendAmount(amount: unknown): number;
export function applyWalletBalanceDelta(
  balance: unknown,
  delta: unknown,
  options?: { allowNegative?: boolean }
): WalletBalanceDeltaResult;
export function createWalletTransactionDraft(input?: {
  id?: string | null;
  playerId?: string | null;
  currencyCode?: unknown;
  delta?: unknown;
  balanceAfter?: unknown;
  reason?: unknown;
  sourceType?: string | null;
  sourceId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
}): WalletTransactionDraft;
export function normalizeWalletPurchaseStatus(status: unknown): string;
export function isWalletPurchaseStatus(status: unknown): boolean;
export function isWalletPurchaseClawbackStatus(status: unknown): boolean;
export function isWalletPurchaseReviewStatus(status: unknown): boolean;
export function isWalletPurchaseTerminalNonGrantStatus(status: unknown): boolean;
export function canRecordWalletPurchaseStatus(status: unknown): boolean;
export function classifyWalletPurchaseStatus(status: unknown): WalletPurchaseStatusClassification;
export function normalizeWalletPriceCurrency(currency: unknown): string | null;
export function walletPurchasePriceMatches(input?: {
  expectedAmount?: unknown;
  expectedCurrency?: unknown;
  receivedAmount?: unknown;
  receivedCurrency?: unknown;
}): WalletPurchasePriceMatch;
export function walletPurchaseIntentMetadata(intent?: Record<string, unknown>): Record<string, unknown>;
export function walletPurchaseIntentSnapshot(intent?: Record<string, unknown>): WalletPurchaseIntentSnapshot;
export function createWalletPurchaseIntentDraft(input?: {
  id?: string | null;
  playerId?: string | null;
  bundle?: {
    id?: string;
    provider?: string;
    currencyCode?: unknown;
    walletAmount?: unknown;
    priceAmount?: unknown;
    priceCurrency?: unknown;
  };
  providerInvoiceId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
  status?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}): WalletPurchaseIntentSnapshot & {
  metadata: Record<string, unknown>;
  providerPaymentId: null;
};
export function shapeWalletPurchaseCheckout(
  intent?: Record<string, unknown>,
  options?: { coinLabel?: string }
): Record<string, unknown>;
export function walletPurchaseCheckoutIsResolved(intent?: Record<string, unknown>): boolean;
export function createWalletPurchaseCheckoutMetadataPatch(
  intent?: Record<string, unknown>,
  checkout?: Record<string, unknown>
): {
  providerInvoiceId: string | null;
  metadata: Record<string, unknown>;
  checkoutStatus: 'ready';
  checkoutClaimToken: null;
  checkoutClaimedAt: null;
};
export function createWalletPurchaseCompletionPlan(
  intent?: Record<string, unknown>,
  options?: {
    provider?: string | null;
    providerPaymentId?: string | null;
    priceAmount?: unknown;
    priceCurrency?: unknown;
    metadata?: Record<string, unknown>;
  }
): {
  action: string;
  ok: boolean;
  intent: WalletPurchaseIntentSnapshot;
  providerPaymentId?: string | null;
  metadata?: Record<string, unknown>;
  grantMutation?: WalletMutationParams;
  priceCheck?: WalletPurchasePriceMatch;
  reason?: string;
  transaction?: null;
};
export function createWalletPurchaseGrantMutation(
  intent?: Record<string, unknown>,
  options?: { provider?: string | null; providerPaymentId?: string | null; metadata?: Record<string, unknown> }
): WalletMutationParams;
export function createWalletPurchaseReversalMutation(
  intent?: Record<string, unknown>,
  options?: { provider?: string | null; status?: unknown; payload?: Record<string, unknown> }
): WalletMutationParams;
export function walletSettlementRequiresGrant(settlementStatus: unknown): boolean;
export function walletSettlementRequiresClawback(settlementStatus: unknown): boolean;
export function walletSettlementRequiresReview(settlementStatus: unknown): boolean;
export function walletSettlementMatchesPurchaseStatus(
  settlementStatus: unknown,
  purchaseStatus: unknown
): boolean;
