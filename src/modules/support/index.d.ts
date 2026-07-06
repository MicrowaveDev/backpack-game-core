export interface SupportLookupResult {
  query?: string;
  limit?: unknown;
  counts?: Record<string, number>;
  [collection: string]: unknown;
}

export interface SupportLookupOptions {
  includeCounts?: boolean;
  collectionNames?: string[];
  collectionLimits?: Record<string, number>;
  mappers?: Record<string, (row: unknown) => unknown>;
}

export function shapeSupportLookupResult(
  input?: {
    query?: unknown;
    limit?: unknown;
    counts?: Record<string, number>;
    collections?: Record<string, unknown[]>;
    players?: unknown[];
    runs?: unknown[];
    walletBalances?: unknown[];
    purchaseIntents?: unknown[];
    walletTransactions?: unknown[];
    paymentWebhookEvents?: unknown[];
    assetInstances?: unknown[];
    equippedAssets?: unknown[];
    assetRolls?: unknown[];
    supportActions?: unknown[];
  },
  options?: SupportLookupOptions
): SupportLookupResult;

export function shapeSupportMutationResult(
  payload?: Record<string, unknown>,
  options?: {
    supportActionKey?: string;
    includeNullAction?: boolean;
  }
): Record<string, unknown>;

export function shapeSupportWalletMutationResult(
  payload?: {
    transaction?: unknown;
    wallet?: unknown;
    supportAction?: unknown;
    action?: unknown;
  },
  options?: Parameters<typeof shapeSupportMutationResult>[1]
): Record<string, unknown>;

export function shapeSupportAssetGrantResult(
  payload?: {
    assetId?: unknown;
    instance?: unknown;
    alreadyOwned?: unknown;
    assetState?: unknown;
    supportAction?: unknown;
    action?: unknown;
  },
  options?: Parameters<typeof shapeSupportMutationResult>[1]
): Record<string, unknown>;

export function shapeSupportAssetRevokeResult(
  payload?: {
    revoked?: unknown;
    assetState?: unknown;
    supportAction?: unknown;
    action?: unknown;
  },
  options?: Parameters<typeof shapeSupportMutationResult>[1]
): Record<string, unknown>;

export function shapeSupportRunResetResult(
  payload?: {
    run?: unknown;
    supportAction?: unknown;
    action?: unknown;
  },
  options?: Parameters<typeof shapeSupportMutationResult>[1]
): Record<string, unknown>;
