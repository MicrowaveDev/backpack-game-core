const DEFAULT_LOOKUP_COLLECTIONS = Object.freeze([
  'players',
  'runs',
  'walletBalances',
  'purchaseIntents',
  'walletTransactions',
  'paymentWebhookEvents',
  'assetInstances',
  'equippedAssets',
  'assetRolls',
  'supportActions'
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cloneRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  return { ...row };
}

function normalizeLimit(limit) {
  const value = Number(limit);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function uniqueNames(...groups) {
  const names = [];
  const seen = new Set();
  for (const group of groups) {
    for (const name of asArray(group)) {
      if (typeof name !== 'string' || !name.trim() || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

function shapeCollection(name, rows, { collectionLimits = {}, mappers = {} } = {}) {
  const limit = normalizeLimit(collectionLimits[name]);
  const selected = limit == null ? asArray(rows) : asArray(rows).slice(-limit);
  const mapper = typeof mappers[name] === 'function' ? mappers[name] : cloneRow;
  return selected.map((row) => mapper(row));
}

function firstNonNull(...values) {
  return values.find((value) => value != null);
}

export function shapeSupportLookupResult({
  query,
  limit,
  counts,
  collections = {},
  players,
  runs,
  walletBalances,
  purchaseIntents,
  walletTransactions,
  paymentWebhookEvents,
  assetInstances,
  equippedAssets,
  assetRolls,
  supportActions
} = {}, {
  includeCounts,
  collectionNames = [],
  collectionLimits = {},
  mappers = {}
} = {}) {
  const rawCollections = {
    players,
    runs,
    walletBalances,
    purchaseIntents,
    walletTransactions,
    paymentWebhookEvents,
    assetInstances,
    equippedAssets,
    assetRolls,
    supportActions,
    ...collections
  };
  const names = uniqueNames(
    DEFAULT_LOOKUP_COLLECTIONS,
    Object.keys(collections || {}),
    collectionNames
  );
  const result = {};
  if (query != null) result.query = String(query);
  if (limit != null) result.limit = limit;

  const computedCounts = {};
  for (const name of names) {
    if (!(name in rawCollections) || rawCollections[name] === undefined) continue;
    result[name] = shapeCollection(name, rawCollections[name], { collectionLimits, mappers });
    computedCounts[name] = result[name].length;
  }

  if (includeCounts === true || (includeCounts !== false && counts != null)) {
    result.counts = { ...computedCounts, ...(counts || {}) };
  }
  return result;
}

export function shapeSupportMutationResult(payload = {}, {
  supportActionKey = 'supportAction',
  includeNullAction = false
} = {}) {
  const result = {};
  for (const [key, value] of Object.entries(payload || {})) {
    if (key === 'supportAction' || key === 'action') continue;
    if (value !== undefined) result[key] = value;
  }
  const supportAction = firstNonNull(payload.supportAction, payload.action);
  if (supportAction != null || includeNullAction) result[supportActionKey] = supportAction ?? null;
  return result;
}

export function shapeSupportWalletMutationResult({
  transaction,
  wallet,
  supportAction,
  action
} = {}, options = {}) {
  return shapeSupportMutationResult({ transaction, wallet, supportAction, action }, options);
}

export function shapeSupportAssetGrantResult({
  assetId,
  instance,
  alreadyOwned = false,
  assetState,
  supportAction,
  action
} = {}, options = {}) {
  return shapeSupportMutationResult({
    assetId,
    instance,
    alreadyOwned: Boolean(alreadyOwned),
    assetState,
    supportAction,
    action
  }, options);
}

export function shapeSupportAssetRevokeResult({
  revoked,
  assetState,
  supportAction,
  action
} = {}, options = {}) {
  return shapeSupportMutationResult({ revoked, assetState, supportAction, action }, options);
}

export function shapeSupportRunResetResult({
  run,
  supportAction,
  action
} = {}, options = {}) {
  return shapeSupportMutationResult({ run, supportAction, action }, options);
}
