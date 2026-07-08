export interface MushroomWalletServicePortOptions {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }>;
  withTransaction: <T>(fn: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number }> }) => Promise<T>) => Promise<T>;
  createId: (prefix: string) => string;
  nowIso: () => string;
  parseJson?: (value: unknown, fallback?: unknown) => unknown;
  env?: Record<string, string | undefined>;
  defaultFetch?: typeof fetch;
}

export interface MushroomWalletServicePort {
  auditWalletMirror(options?: Record<string, unknown>): Promise<unknown>;
  backfillMissingWalletBalancesFromPlayers(options?: Record<string, unknown>): Promise<unknown>;
  completeProviderWebhook(provider: string, payload?: unknown, options?: Record<string, unknown>): Promise<unknown>;
  completePurchaseIntent(options?: Record<string, unknown>): Promise<unknown>;
  completeTelegramSuccessfulPayment(successfulPayment: unknown): Promise<unknown>;
  createPurchaseIntent(playerId: string, options?: Record<string, unknown>): Promise<unknown>;
  expireStalePurchaseIntents(options?: Record<string, unknown>): Promise<unknown>;
  getPaymentSupportLinks(options?: Record<string, unknown>): unknown;
  getWalletBundles(provider?: string | null, options?: Record<string, unknown>): unknown[];
  getWalletPurchaseProviders(surface?: string): string[];
  getWalletState(playerId: string, options?: Record<string, unknown>): Promise<unknown>;
  grantCurrency(client: unknown, params: Record<string, unknown>): Promise<unknown>;
  grantCurrencyForPlayer(params: Record<string, unknown>): Promise<unknown>;
  normalizePaymentSurface(surface?: string): string;
  processProviderWebhookEvent(provider: string, payload?: unknown, options?: Record<string, unknown>): Promise<unknown>;
  reconcileWalletPayments(options?: Record<string, unknown>): Promise<unknown>;
  spendCurrency(client: unknown, params: Record<string, unknown>): Promise<unknown>;
  spendCurrencyForPlayer(params: Record<string, unknown>): Promise<unknown>;
  validateTelegramPreCheckout(preCheckoutQuery: unknown): Promise<unknown>;
  withWalletMutationLock<T>(playerId: string, work: () => Promise<T>): Promise<T>;
}

export declare const WALLET_CURRENCY_CODE: string;
export declare const WALLET_PAYMENT_SURFACES: Record<string, string[]>;
export declare const WALLET_PURCHASE_PROVIDERS: Set<string>;
export declare const WALLET_PURCHASE_STATUSES: Set<string>;

export declare function createMushroomWalletServicePort(options?: MushroomWalletServicePortOptions): MushroomWalletServicePort;
