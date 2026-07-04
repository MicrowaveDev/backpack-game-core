import { getEffectiveShape, normalizeRotation } from './bag-shape.js';

function artifactLookup(getArtifact) {
  if (typeof getArtifact === 'function') return getArtifact;
  if (getArtifact instanceof Map) return (id) => getArtifact.get(id);
  return () => null;
}

function bagIdSet(bagArtifactIds) {
  return bagArtifactIds instanceof Set ? bagArtifactIds : new Set(bagArtifactIds || []);
}

export function projectLoadoutItems(loadoutItems = [], bagArtifactIds = [], getArtifact = null) {
  const bagsSet = bagIdSet(bagArtifactIds);
  const builderItems = [];
  const containerItems = [];
  const activeBags = [];
  const rotatedBags = [];
  const freshPurchases = [];

  for (const item of loadoutItems || []) {
    const isBagRow = bagsSet.has(item.artifactId);
    if (isBagRow) {
      if (item.active) {
        activeBags.push({
          id: item.id,
          artifactId: item.artifactId,
          anchorX: Number(item.x ?? 0),
          anchorY: Number(item.y ?? 0)
        });
      } else {
        containerItems.push({ id: item.id, artifactId: item.artifactId });
      }
      const rotation = normalizeRotation(item.rotated);
      if (rotation) rotatedBags.push({ id: item.id, artifactId: item.artifactId, rotation });
      if (item.freshPurchase) freshPurchases.push(item.artifactId);
      continue;
    }

    if (Number(item.x) >= 0 && Number(item.y) >= 0) {
      builderItems.push({
        id: item.id,
        artifactId: item.artifactId,
        x: Number(item.x),
        y: Number(item.y),
        width: Number(item.width),
        height: Number(item.height)
      });
    } else {
      containerItems.push({ id: item.id, artifactId: item.artifactId });
    }
    if (item.freshPurchase) freshPurchases.push(item.artifactId);
  }

  return {
    builderItems,
    containerItems,
    activeBags,
    rotatedBags,
    freshPurchases
  };
}

export function prepareGridProps(loadoutItems = [], bagArtifactIds = [], getArtifact = null, options = {}) {
  const columns = Number(options.columns ?? 6);
  const minRows = Number(options.minRows ?? 6);
  const projected = projectLoadoutItems(loadoutItems, bagArtifactIds, getArtifact);
  const lookupArtifact = artifactLookup(getArtifact);
  const rotationById = new Map(projected.rotatedBags.map((bag) => [bag.id, normalizeRotation(bag.rotation ?? 1)]));
  const rows = [];
  let maxBottom = minRows;

  for (const activeBag of projected.activeBags) {
    const bag = lookupArtifact(activeBag.artifactId);
    if (!bag) continue;
    const rotation = rotationById.get(activeBag.id) ?? 0;
    const shape = getEffectiveShape(bag, rotation);
    const anchorX = activeBag.anchorX ?? 0;
    const anchorY = activeBag.anchorY ?? 0;
    const bottom = anchorY + shape.length;
    if (bottom > maxBottom) maxBottom = bottom;
    for (let i = 0; i < shape.length; i += 1) {
      const maskRow = shape[i] || [];
      const enabledCells = [];
      for (let x = 0; x < maskRow.length; x += 1) {
        const cellX = anchorX + x;
        if (cellX >= columns) break;
        if (maskRow[x]) enabledCells.push(cellX);
      }
      if (enabledCells.length === 0) continue;
      rows.push({
        bagId: activeBag.id,
        row: anchorY + i,
        color: bag.color || '#888',
        artifactId: activeBag.artifactId,
        rotation,
        enabledCells,
        bboxStart: anchorX,
        bboxEnd: Math.min(anchorX + maskRow.length, columns)
      });
    }
  }

  return {
    items: projected.builderItems,
    bagRows: rows.sort((a, b) => a.row - b.row),
    totalRows: maxBottom
  };
}

export function bagRowEntryFor(bagRows = [], cx, cy) {
  const slotMatch = (bagRows || []).find(
    (br) => br?.row === cy && br.enabledCells?.includes(cx)
  );
  if (slotMatch) return slotMatch;
  const bboxMatch = (bagRows || []).find((br) => {
    if (br?.row !== cy) return false;
    const start = br.bboxStart ?? br.enabledCells?.[0] ?? -1;
    const end = br.bboxEnd ?? ((br.enabledCells?.[br.enabledCells.length - 1] ?? -1) + 1);
    return cx >= start && cx < end;
  });
  return bboxMatch || null;
}

export function classifyCell(bagRows = [], cx, cy, baseRect = null) {
  const baseCols = Number(baseRect?.cols ?? baseRect?.columns ?? 0);
  const baseRows = Number(baseRect?.rows ?? 0);
  if (
    baseRect
    && cx >= 0 && cx < baseCols
    && cy >= 0 && cy < baseRows
  ) {
    return 'base-inv';
  }
  const entry = bagRowEntryFor(bagRows, cx, cy);
  if (!entry) return 'bag-empty';
  if (entry.enabledCells?.includes(cx)) return 'bag-slot';
  return 'bag-box';
}

export function occupiedCellKeys(items = []) {
  const occupied = new Set();
  for (const item of items || []) {
    const width = Number(item?.width) || 1;
    const height = Number(item?.height) || 1;
    const x = Number(item?.x);
    const y = Number(item?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    for (let dx = 0; dx < width; dx += 1) {
      for (let dy = 0; dy < height; dy += 1) {
        occupied.add(`${x + dx}:${y + dy}`);
      }
    }
  }
  return occupied;
}

export function buildOccupiedCellMap(items = [], {
  valueForItem = (item) => item?.artifactId
} = {}) {
  const occupied = new Map();
  for (const item of items || []) {
    const width = Number(item?.width) || 1;
    const height = Number(item?.height) || 1;
    const x = Number(item?.x);
    const y = Number(item?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const value = valueForItem(item);
    for (let dx = 0; dx < width; dx += 1) {
      for (let dy = 0; dy < height; dy += 1) {
        occupied.set(`${x + dx}:${y + dy}`, value);
      }
    }
  }
  return occupied;
}

export function preferredArtifactOrientation(artifact) {
  const width = Number(artifact?.width) || 0;
  const height = Number(artifact?.height) || 0;
  if (Array.isArray(artifact?.shape)) {
    const shape = artifact.shape;
    return {
      width: Number(shape[0]?.length) || width,
      height: Number(shape.length) || height
    };
  }
  if (width !== height) {
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    return { width: longSide, height: shortSide };
  }
  return { width, height };
}

export function artifactPreviewOrientation(artifact, {
  bagFamily = 'bag'
} = {}) {
  const width = Number(artifact?.width) || 1;
  const height = Number(artifact?.height) || 1;
  if (Array.isArray(artifact?.shape)) {
    const shape = artifact.shape;
    return {
      width: Number(shape[0]?.length) || width,
      height: Number(shape.length) || height
    };
  }
  if (artifact?.family === bagFamily && width !== height) {
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    return { width: longSide, height: shortSide };
  }
  return { width, height };
}

export const DEFAULT_ARTIFACT_STAT_KEYS = ['damage', 'armor', 'speed', 'stunChance'];
export const DEFAULT_ARTIFACT_STAT_SUFFIX_BY_KEY = { stunChance: '%' };

function identity(value) {
  return value || '';
}

function numberOr(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function artifactStatKeys(statKeys, fallback = DEFAULT_ARTIFACT_STAT_KEYS) {
  return Array.isArray(statKeys) && statKeys.length ? statKeys : fallback;
}

function artifactLookupById(artifacts) {
  if (typeof artifacts === 'function') return artifacts;
  if (artifacts instanceof Map) return (id) => artifacts.get(id);
  if (artifacts && typeof artifacts === 'object' && !Array.isArray(artifacts)) {
    return (id) => artifacts[id];
  }
  const map = new Map((artifacts || []).filter(Boolean).map((artifact) => [artifact.id, artifact]));
  return (id) => map.get(id);
}

function artifactBonusSource(source) {
  if (!source || typeof source !== 'object') return {};
  if (source.bonus && typeof source.bonus === 'object') return source.bonus;
  return source;
}

function fillTemplate(template, values = {}) {
  return String(template || '').replace(/\{([^}]+)\}/g, (_, key) => values[key] ?? '');
}

export function sumArtifactBonuses(items = [], artifacts = [], {
  statKeys = DEFAULT_ARTIFACT_STAT_KEYS,
  getArtifactId = (item) => item?.artifactId
} = {}) {
  const keys = artifactStatKeys(statKeys);
  const totals = Object.fromEntries(keys.map((key) => [key, 0]));
  const getArtifact = artifactLookupById(artifacts);

  for (const item of items || []) {
    const artifact = getArtifact(getArtifactId(item));
    const bonus = artifactBonusSource(artifact?.bonus);
    for (const key of keys) {
      totals[key] += numberOr(bonus[key]);
    }
  }

  return totals;
}

export function formatStatDelta(value, {
  suffix = '',
  includeSign = true,
  zero = '0'
} = {}) {
  if (value == null) return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  if (numeric === 0) return `${zero}${suffix}`;
  const sign = includeSign && numeric > 0 ? '+' : '';
  return `${sign}${numeric}${suffix}`;
}

export function formatArtifactBonusEntries(source, {
  labels = {},
  statKeys = null,
  suffixByKey = DEFAULT_ARTIFACT_STAT_SUFFIX_BY_KEY,
  includeZeroes = false
} = {}) {
  const bonus = artifactBonusSource(source);
  const keys = artifactStatKeys(statKeys, Object.keys(bonus));

  return keys
    .map((key) => {
      const numericValue = Number(bonus[key]);
      if (!Number.isFinite(numericValue)) return null;
      if (!includeZeroes && numericValue === 0) return null;
      return {
        key,
        label: labels[key] || key,
        value: formatStatDelta(numericValue, { suffix: suffixByKey[key] || '' }),
        numericValue,
        positive: numericValue > 0
      };
    })
    .filter(Boolean);
}

export function formatLoadoutStatsText({
  totals = null,
  items = [],
  artifacts = [],
  labels = {},
  statKeys = DEFAULT_ARTIFACT_STAT_KEYS,
  suffixByKey = DEFAULT_ARTIFACT_STAT_SUFFIX_BY_KEY,
  separator = ' / ',
  getArtifactId = (item) => item?.artifactId
} = {}) {
  const resolvedTotals = totals || sumArtifactBonuses(items, artifacts, { statKeys, getArtifactId });
  return formatArtifactBonusEntries(resolvedTotals, {
    labels,
    statKeys,
    suffixByKey
  })
    .map((entry) => `${entry.label} ${entry.value}`)
    .join(separator);
}

export function formatAssetPackRarityOdds(pack, {
  rarityLabel = identity
} = {}) {
  const summary = Array.isArray(pack?.raritySummary) && pack.raritySummary.length
    ? pack.raritySummary
    : null;
  if (summary) {
    return summary
      .map((entry) => `${rarityLabel(entry.rarity)} ${Math.round(numberOr(entry.probability) * 100)}%`)
      .join(' · ');
  }
  const items = Array.isArray(pack?.items) ? pack.items : [];
  const total = items.reduce((sum, item) => sum + numberOr(item.dropWeight), 0);
  if (!total) return '';
  const grouped = items.reduce((acc, item) => {
    const rarity = item.rarity || 'common';
    acc[rarity] = (acc[rarity] || 0) + numberOr(item.dropWeight);
    return acc;
  }, {});
  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(([rarity, weight]) => `${rarityLabel(rarity)} ${Math.round((weight / total) * 100)}%`)
    .join(' · ');
}

export function formatAssetPackGuaranteeText(pack, {
  rarityLabel = identity,
  template = 'Guarantee: {count} {rarity}+'
} = {}) {
  const rules = Array.isArray(pack?.guarantees?.rules) ? pack.guarantees.rules : [];
  return rules
    .filter((rule) => numberOr(rule.count) > 0 && rule.minRarity)
    .map((rule) => fillTemplate(template, {
      count: rule.count,
      rarity: rarityLabel(rule.minRarity)
    }))
    .join(' · ');
}

export function formatAssetPackPityText(pack, {
  rarityLabel = identity,
  template = '{rarity}+ pity in {count} opens',
  readyTemplate = '{rarity}+ guaranteed next open'
} = {}) {
  const rules = Array.isArray(pack?.pity?.rules) ? pack.pity.rules : [];
  return rules
    .filter((rule) => numberOr(rule.threshold) > 0 && rule.minRarity)
    .map((rule) => fillTemplate(rule.active ? readyTemplate : template, {
      rarity: rarityLabel(rule.minRarity),
      count: rule.remaining || rule.threshold
    }))
    .join(' · ');
}

export function formatAssetPackDuplicateText(pack, {
  template = 'Duplicates: {count}'
} = {}) {
  if (!pack?.duplicatePolicy?.enabled) return '';
  return fillTemplate(template, { count: numberOr(pack.duplicateCopies) });
}

export function assetPackIsActive(pack, {
  now = Date.now()
} = {}) {
  if (!pack) return false;
  if (pack.availability) return pack.availability === 'active';
  if (pack.active === false || (pack.status && pack.status !== 'active')) return false;
  const timestamp = typeof now === 'number' ? now : new Date(now).getTime();
  const startsAt = pack.startsAt ? new Date(pack.startsAt).getTime() : null;
  const endsAt = pack.endsAt ? new Date(pack.endsAt).getTime() : null;
  if (startsAt && startsAt > timestamp) return false;
  if (endsAt && endsAt <= timestamp) return false;
  return true;
}

export function assetPackAvailabilityLabel(pack, {
  now = Date.now(),
  labels = {}
} = {}) {
  if (assetPackIsActive(pack, { now })) return '';
  if (pack?.availability === 'invalid') return labels.invalid || '';
  if (pack?.availability === 'disabled') return labels.disabled || labels.unavailable || '';
  if (pack?.availability === 'future') return labels.future || '';
  if (pack?.availability === 'expired') return labels.expired || '';
  const timestamp = typeof now === 'number' ? now : new Date(now).getTime();
  const startsAt = pack?.startsAt ? new Date(pack.startsAt).getTime() : null;
  const endsAt = pack?.endsAt ? new Date(pack.endsAt).getTime() : null;
  if (startsAt && startsAt > timestamp) return labels.future || '';
  if (endsAt && endsAt <= timestamp) return labels.expired || '';
  return labels.unavailable || '';
}

export function summarizeAssetRollPacks({
  portraits = [],
  packs = [],
  ownedAssetIds = [],
  now = Date.now(),
  packName = (pack) => pack?.name || pack?.id || '',
  rarityLabel = identity,
  labels = {}
} = {}) {
  const packById = new Map((packs || []).filter(Boolean).map((pack) => [pack.id, pack]));
  const selectedAssetIds = new Set((portraits || []).map((portrait) => portrait.assetId).filter(Boolean));
  const packIds = new Set((portraits || [])
    .filter((portrait) => portrait.packId && (!portrait.unlocked || portrait.rollAvailable))
    .map((portrait) => portrait.packId));
  for (const pack of packs || []) {
    if ((pack?.items || []).some((item) => selectedAssetIds.has(item.assetId))) {
      packIds.add(pack.id);
    }
  }
  const owned = ownedAssetIds instanceof Set ? ownedAssetIds : new Set(ownedAssetIds || []);

  return [...packIds]
    .map((packId) => packById.get(packId))
    .filter(Boolean)
    .map((pack) => {
      const total = Number.isFinite(Number(pack.totalItems)) ? Number(pack.totalItems) : (pack.items?.length || 0);
      const ownedCount = Number.isFinite(Number(pack.ownedCount))
        ? Number(pack.ownedCount)
        : (pack.items || []).filter((item) => owned.has(item.assetId)).length;
      const left = Number.isFinite(Number(pack.remainingCount))
        ? Number(pack.remainingCount)
        : Math.max(0, total - ownedCount);
      const duplicateEnabled = Boolean(pack.duplicatePolicy?.enabled);
      const burnRules = Array.isArray(pack?.burn?.rules) ? pack.burn.rules : [];
      const readyBurnRule = burnRules.find((rule) => rule.ready) || burnRules[0] || null;
      const rollableCount = Number.isFinite(Number(pack.rollableCount))
        ? Number(pack.rollableCount)
        : duplicateEnabled ? total : left;
      const complete = Boolean(pack.complete) || (!duplicateEnabled && left <= 0);
      const active = assetPackIsActive(pack, { now });
      return {
        id: pack.id,
        name: packName(pack),
        total,
        owned: ownedCount,
        left,
        rollSize: Number(pack.rollSize || 1),
        nextRollItemCount: Number(pack.nextRollItemCount || Math.min(Number(pack.rollSize || 1), rollableCount)),
        active,
        availabilityLabel: assetPackAvailabilityLabel(pack, { now, labels }),
        price: pack.rollPriceAmount || 0,
        complete,
        duplicateEnabled,
        uniqueComplete: Boolean(pack.uniqueComplete),
        copyComplete: Boolean(pack.copyComplete),
        duplicateCopies: numberOr(pack.duplicateCopies),
        canRoll: active && !complete && rollableCount > 0,
        canBurn: active && Boolean(readyBurnRule?.ready),
        burnRuleId: readyBurnRule?.id || null,
        burnCost: numberOr(readyBurnRule?.sourceCount),
        burnRarity: readyBurnRule?.sourceRarity ? rarityLabel(readyBurnRule.sourceRarity) : '',
        odds: formatAssetPackRarityOdds(pack, { rarityLabel }),
        guaranteeText: formatAssetPackGuaranteeText(pack, {
          rarityLabel,
          template: labels.guaranteeTemplate
        }),
        pityText: formatAssetPackPityText(pack, {
          rarityLabel,
          template: labels.pityTemplate,
          readyTemplate: labels.pityReadyTemplate
        }),
        duplicateText: formatAssetPackDuplicateText(pack, {
          template: labels.duplicateTemplate
        })
      };
    });
}

export function resolveWalletBalance({
  wallet = null,
  player = null,
  currencyCode = 'soft_coin',
  legacyField = 'spore',
  fallback = 0
} = {}) {
  return wallet?.balances?.[currencyCode] ?? player?.[legacyField] ?? fallback;
}

export function selectWalletBundles({
  bundles = [],
  bundleSurface = null,
  surface = null
} = {}) {
  if (bundleSurface !== surface) return [];
  return Array.isArray(bundles) ? bundles : [];
}

export function walletBundlesLoadingViewState({
  surface = null
} = {}) {
  return {
    loading: true,
    bundles: [],
    surface,
    errorMessage: ''
  };
}

export function walletBundlesLoadedViewState(bundles = [], {
  surface = null
} = {}) {
  return {
    loading: false,
    bundles: Array.isArray(bundles) ? bundles : [],
    surface,
    errorMessage: ''
  };
}

export function walletBundlesErrorViewState(error, {
  surface = null,
  bundles = [],
  fallbackMessage = 'Failed to load wallet bundles'
} = {}) {
  return {
    loading: false,
    bundles: Array.isArray(bundles) ? bundles : [],
    surface,
    errorMessage: messageFromError(error, fallbackMessage)
  };
}

export function formatWalletBundlePrice(bundle, {
  minorUnitCurrencyDecimals = { USD: 2 },
  currencySymbols = { USD: '$' }
} = {}) {
  const amount = numberOr(bundle?.priceAmount);
  const currency = bundle?.priceCurrency || '';
  if (Object.prototype.hasOwnProperty.call(minorUnitCurrencyDecimals, currency)) {
    const decimals = numberOr(minorUnitCurrencyDecimals[currency]);
    const formatted = (amount / (10 ** decimals)).toFixed(decimals);
    const symbol = currencySymbols[currency] || '';
    return symbol ? `${symbol}${formatted}` : `${formatted} ${currency}`.trim();
  }
  return `${amount} ${currency}`.trim();
}

export function walletPurchaseStatusText(status, {
  labels = {}
} = {}) {
  if (!status) return '';
  return labels[status] || '';
}

export function walletSupportEntries({
  support = {},
  labels = {}
} = {}) {
  return [
    support.supportUrl ? { label: labels.support || 'Support', url: support.supportUrl } : null,
    support.termsUrl ? { label: labels.terms || 'Terms', url: support.termsUrl } : null
  ].filter(Boolean);
}

export function summarizeWalletPurchaseSurface({
  wallet = null,
  player = null,
  currencyCode = 'soft_coin',
  legacyField = 'spore',
  fallbackBalance = 0,
  bundles = [],
  bundleSurface = null,
  surface = null,
  status = '',
  support = {},
  labels = {}
} = {}) {
  return {
    balance: resolveWalletBalance({ wallet, player, currencyCode, legacyField, fallback: fallbackBalance }),
    bundles: selectWalletBundles({ bundles, bundleSurface, surface }),
    statusText: walletPurchaseStatusText(status, { labels: labels.status || labels }),
    supportEntries: walletSupportEntries({ support, labels })
  };
}

export function walletPurchaseStatusFromIntent(intent, {
  completedStatus = 'completed',
  expiredStatuses = ['expired'],
  failedStatuses = ['failed', 'cancelled', 'refunded', 'reversed', 'chargeback'],
  checkoutExpiredStatuses = ['expired'],
  checkoutFailedStatuses = ['failed']
} = {}) {
  const status = String(intent?.status || '').toLowerCase();
  const checkoutStatus = String(intent?.checkoutStatus || '').toLowerCase();
  if (status === String(completedStatus || '').toLowerCase()) return 'confirmed';
  if (statusIn(expiredStatuses, status) || statusIn(checkoutExpiredStatuses, checkoutStatus)) return 'expired';
  if (statusIn(failedStatuses, status) || statusIn(checkoutFailedStatuses, checkoutStatus)) return 'failed';
  return '';
}

export function walletPurchaseStatusFromTelegramInvoice(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'paid') return 'confirmed';
  if (normalized === 'pending') return 'pending';
  if (normalized === 'expired') return 'expired';
  if (['failed', 'cancelled'].includes(normalized)) return 'failed';
  return 'failed';
}

export function walletPurchaseOpeningViewState({
  status = 'opening'
} = {}) {
  return {
    status,
    errorMessage: ''
  };
}

export function walletPurchaseIntentViewState(intent, options = {}) {
  const status = walletPurchaseStatusFromIntent(intent, options);
  return {
    status,
    handled: Boolean(status),
    shouldRefresh: status === 'confirmed'
  };
}

export function walletPurchaseCheckoutViewState({
  checkout = {},
  hasTelegramInvoice = false,
  hasWebCheckout = false,
  setupRequiredMessage = 'Wallet purchases are not configured yet',
  unavailableMessage = 'Payment checkout is not available'
} = {}) {
  if (hasTelegramInvoice || hasWebCheckout) {
    return {
      status: 'opened',
      errorMessage: '',
      canOpen: true
    };
  }
  return {
    status: 'failed',
    errorMessage: checkout?.setupRequired ? setupRequiredMessage : unavailableMessage,
    canOpen: false
  };
}

export function walletPurchaseNextAction(intent, {
  hasTelegramInvoice = false,
  hasWebCheckout = false,
  setupRequiredMessage = 'Wallet purchases are not configured yet',
  unavailableMessage = 'Payment checkout is not available',
  intentOptions = {}
} = {}) {
  const intentViewState = walletPurchaseIntentViewState(intent, intentOptions);
  if (intentViewState.handled) {
    return {
      action: 'status',
      status: intentViewState.status,
      errorMessage: '',
      shouldRefresh: intentViewState.shouldRefresh,
      checkout: null,
      invoiceLink: null,
      checkoutUrl: null,
      viewState: intentViewState
    };
  }

  const checkout = intent?.checkout && typeof intent.checkout === 'object' ? intent.checkout : {};
  const canOpenTelegramInvoice = Boolean(checkout.invoiceLink) && Boolean(hasTelegramInvoice);
  const canOpenWebCheckout = Boolean(checkout.checkoutUrl) && Boolean(hasWebCheckout);
  const checkoutViewState = walletPurchaseCheckoutViewState({
    checkout,
    hasTelegramInvoice: canOpenTelegramInvoice,
    hasWebCheckout: canOpenWebCheckout,
    setupRequiredMessage,
    unavailableMessage
  });
  return {
    action: canOpenTelegramInvoice ? 'telegram_invoice' : canOpenWebCheckout ? 'web_checkout' : 'unavailable',
    status: checkoutViewState.status,
    errorMessage: checkoutViewState.errorMessage,
    shouldRefresh: false,
    checkout,
    invoiceLink: canOpenTelegramInvoice ? checkout.invoiceLink : null,
    checkoutUrl: canOpenWebCheckout ? checkout.checkoutUrl : null,
    viewState: checkoutViewState
  };
}

export function walletPurchaseErrorViewState(error, {
  fallbackMessage = 'Failed to start wallet purchase'
} = {}) {
  return {
    status: 'failed',
    errorMessage: messageFromError(error, fallbackMessage)
  };
}

function localizeUnknownName(value) {
  if (value && typeof value === 'object') return value.en || Object.values(value)[0] || '';
  return value || '';
}

function statusIn(statuses = [], value) {
  return statuses.some((status) => value === String(status || '').toLowerCase());
}

function includesAny(value, patterns = []) {
  return patterns.some((pattern) => value.includes(String(pattern || '').toLowerCase()));
}

function messageFromError(error, fallbackMessage = '') {
  if (typeof error === 'string') return error || fallbackMessage;
  return error?.message || fallbackMessage;
}

export function assetRollStatusFromError(error, {
  completePatterns = ['no unowned assets', 'no rollable assets'],
  burnUnavailablePatterns = ['duplicate assets'],
  insufficientPatterns = ['insufficient', 'not enough'],
  disabledPatterns = ['disabled'],
  unavailablePatterns = ['not active', 'inactive', 'expired'],
  invalidPatterns = ['configuration is invalid']
} = {}) {
  const message = String(error?.message || error || '').toLowerCase();
  if (includesAny(message, completePatterns)) return 'complete';
  if (includesAny(message, burnUnavailablePatterns)) return 'burn_unavailable';
  if (includesAny(message, insufficientPatterns)) return 'insufficient';
  if (includesAny(message, disabledPatterns)) return 'disabled';
  if (includesAny(message, unavailablePatterns)) return 'unavailable';
  if (includesAny(message, invalidPatterns)) return 'invalid';
  return 'failed';
}

export function assetRollPendingViewState({
  status = 'rolling'
} = {}) {
  return {
    status,
    result: null,
    errorMessage: '',
    globalErrorMessage: ''
  };
}

export function assetRollResultViewState(response, {
  successKey = 'roll',
  resultKey = 'rollResult',
  successStatus = 'success',
  failureStatus = 'failed',
  failureMessage = 'Failed to roll pack'
} = {}) {
  const success = successKey ? Boolean(response?.[successKey]) : Boolean(response);
  if (success) {
    return {
      status: successStatus,
      result: resultKey ? response?.[resultKey] || null : response || null,
      errorMessage: '',
      globalErrorMessage: ''
    };
  }
  return {
    status: failureStatus,
    result: null,
    errorMessage: failureMessage,
    globalErrorMessage: ''
  };
}

export function assetRollErrorViewState(error, {
  fallbackMessage = 'Failed to roll pack',
  globalErrorStatuses = ['failed', 'invalid'],
  statusOptions = {}
} = {}) {
  const status = assetRollStatusFromError(error, statusOptions);
  const errorMessage = messageFromError(error, fallbackMessage);
  const shouldSurface = new Set(globalErrorStatuses || []).has(status);
  return {
    status,
    result: null,
    errorMessage,
    globalErrorMessage: shouldSurface ? errorMessage : ''
  };
}

export function assetRollMutationResultViewState(response, options = {}) {
  const viewState = assetRollResultViewState(response, options);
  const refreshStatuses = Array.isArray(options.refreshStatuses)
    ? options.refreshStatuses
    : [options.successStatus || 'success'];
  return {
    ...viewState,
    shouldRefresh: refreshStatuses.includes(viewState.status)
  };
}

export function assetRollMutationErrorViewState(error, options = {}) {
  return {
    ...assetRollErrorViewState(error, options),
    shouldRefresh: false
  };
}

function runArrayFrom(value) {
  return Array.isArray(value) ? value : [];
}

function gameRunCompletionRunFrom(response) {
  if (!response) return null;
  return {
    id: response.id,
    mode: response.mode,
    status: response.status,
    currentRound: response.currentRound,
    startedAt: response.startedAt,
    endedAt: response.endedAt,
    endReason: response.endReason,
    completionBonus: response.completionBonus || null,
    player: response.player || null
  };
}

function gameRunCompletionResultFrom(response) {
  if (!response) return null;
  return {
    id: response.id,
    mode: response.mode,
    status: response.status,
    currentRound: response.currentRound,
    endedAt: response.endedAt,
    endReason: response.endReason,
    completionBonus: response.completionBonus || null,
    season: response.season || null,
    achievements: runArrayFrom(response.achievements),
    player: response.player || null,
    playerResults: response.playerResults || null,
    lastRound: response.lastRound || null,
    rounds: runArrayFrom(response.rounds)
  };
}

function mergeGameRunRound(previousRounds, currentRound) {
  if (!currentRound) return previousRounds;
  return [
    ...previousRounds.filter((round) => round?.roundNumber !== currentRound.roundNumber),
    currentRound
  ].sort((a, b) => (a?.roundNumber || 0) - (b?.roundNumber || 0));
}

function gameRunIsCompleteStatus(status) {
  return status === 'completed' || status === 'abandoned';
}

export function gameRunStartResultViewState(response) {
  const run = response
    ? {
        ...response,
        loadoutItems: runArrayFrom(response.loadoutItems)
      }
    : null;
  return {
    run,
    rounds: [],
    shopOffer: runArrayFrom(run?.shopOffer),
    refreshCount: 0,
    result: null,
    fusionRevealQueue: [],
    errorMessage: ''
  };
}

export function gameRunReadyResultViewState(response, {
  run = null,
  previousRounds = null
} = {}) {
  const waiting = Boolean(response?.waiting);
  const baseRounds = Array.isArray(previousRounds)
    ? previousRounds
    : runArrayFrom(run?.rounds);
  const currentRound = response?.lastRound || null;
  const rounds = waiting
    ? baseRounds
    : mergeGameRunRound(baseRounds, currentRound);
  const resultRounds = runArrayFrom(response?.rounds).length
    ? response.rounds
    : rounds;
  let nextRun = run || null;

  if (!waiting && nextRun) {
    nextRun = {
      ...nextRun,
      currentRound: response?.currentRound ?? nextRun.currentRound,
      player: response?.player || nextRun.player,
      rounds
    };
    if (gameRunIsCompleteStatus(response?.status)) {
      nextRun = {
        ...nextRun,
        status: response.status,
        endReason: response.endReason,
        completionBonus: response.completionBonus || null,
        rounds
      };
    }
  }

  const battleId = response?.lastRound?.battleId || null;
  const status = response?.status || nextRun?.status || '';
  return {
    waiting,
    run: nextRun,
    result: waiting || !response ? null : { ...response, rounds: resultRounds },
    rounds,
    battleId,
    battle: response?.battle || null,
    shouldLoadReplay: Boolean(battleId),
    shouldShowComplete: !battleId && gameRunIsCompleteStatus(status),
    completionGameRunId: response?.id || nextRun?.id || null,
    errorMessage: ''
  };
}

export function gameRunRoundTransitionViewState(resolvedRun, {
  run = null
} = {}) {
  const hasRunPayload = Array.isArray(resolvedRun?.loadoutItems) && Array.isArray(resolvedRun?.shopOffer);
  const nextRun = hasRunPayload && run
    ? {
        ...run,
        status: resolvedRun.status || run.status,
        currentRound: resolvedRun.currentRound ?? run.currentRound,
        player: resolvedRun.player || run.player,
        shopOffer: resolvedRun.shopOffer,
        loadoutItems: resolvedRun.loadoutItems
      }
    : run || null;
  return {
    run: nextRun,
    result: null,
    refreshCount: 0,
    fusionRevealQueue: runArrayFrom(resolvedRun?.fusions),
    shopOffer: hasRunPayload ? resolvedRun.shopOffer : [],
    loadoutItems: hasRunPayload ? resolvedRun.loadoutItems : [],
    shouldRefreshBootstrap: !hasRunPayload,
    errorMessage: ''
  };
}

export function gameRunCompletionResultViewState(response) {
  return {
    run: gameRunCompletionRunFrom(response),
    result: gameRunCompletionResultFrom(response),
    rounds: runArrayFrom(response?.rounds),
    shopOffer: [],
    errorMessage: ''
  };
}

export const LONG_BATTLE_SPEED_BOOST_2X_INDEX = 45;
export const LONG_BATTLE_SPEED_BOOST_3X_INDEX = 90;
export const LONG_BATTLE_SPEED_BOOST_4X_INDEX = 120;
export const DEFAULT_REPLAY_SPEEDS = [2, 4, 8];

export function replayLongBattleSpeedBoost(eventCount, replayIndex, {
  boost2xIndex = LONG_BATTLE_SPEED_BOOST_2X_INDEX,
  boost3xIndex = LONG_BATTLE_SPEED_BOOST_3X_INDEX,
  boost4xIndex = LONG_BATTLE_SPEED_BOOST_4X_INDEX
} = {}) {
  const count = Number(eventCount) || 0;
  const index = Number(replayIndex) || 0;
  if (count <= boost2xIndex || index < boost2xIndex) return 1;
  if (count > boost4xIndex && index >= boost4xIndex) return 4;
  if (count > boost3xIndex && index >= boost3xIndex) return 3;
  return 2;
}

export function preferredReplaySpeed(settings = null, {
  allowedSpeeds = DEFAULT_REPLAY_SPEEDS,
  fallback = 2
} = {}) {
  const speed = Number(settings?.replaySpeed);
  return allowedSpeeds.includes(speed) ? speed : fallback;
}

export function replayAutoplayDelayViewState({
  eventCount = 0,
  replayIndex = 0,
  replaySpeed = null,
  settings = null,
  defaultDelayMs = 1200,
  fastDelayMs = 600,
  minDelayMs = 50
} = {}) {
  const selectedSpeed = Number(replaySpeed) || preferredReplaySpeed(settings);
  const boost = replayLongBattleSpeedBoost(eventCount, replayIndex);
  const speed = selectedSpeed * boost;
  const baseDelay = settings?.battleSpeed === '2x' ? fastDelayMs : defaultDelayMs;
  return {
    selectedSpeed,
    boost,
    speed,
    baseDelay,
    delay: Math.max(minDelayMs, Math.round(baseDelay / speed))
  };
}

export function replayAdvanceTickViewState({
  battle = null,
  replayIndex = 0
} = {}) {
  const events = runArrayFrom(battle?.events);
  if (!battle || !events.length) {
    return {
      replayIndex: numberOr(replayIndex),
      finished: true,
      shouldStop: true,
      shouldRestartTimer: false,
      previousBoost: 1,
      nextBoost: 1
    };
  }
  const index = numberOr(replayIndex);
  const lastIndex = events.length - 1;
  if (index >= lastIndex) {
    const boost = replayLongBattleSpeedBoost(events.length, index);
    return {
      replayIndex: index,
      finished: true,
      shouldStop: true,
      shouldRestartTimer: false,
      previousBoost: boost,
      nextBoost: boost
    };
  }
  const previousBoost = replayLongBattleSpeedBoost(events.length, index);
  const nextIndex = Math.min(lastIndex, index + 1);
  const nextBoost = replayLongBattleSpeedBoost(events.length, nextIndex);
  return {
    replayIndex: nextIndex,
    finished: nextIndex >= lastIndex,
    shouldStop: false,
    shouldRestartTimer: nextBoost !== previousBoost && nextIndex < lastIndex,
    previousBoost,
    nextBoost
  };
}

export function replayLoadResultViewState(battle, {
  settings = null
} = {}) {
  return {
    currentBattle: battle || null,
    replayIndex: 0,
    replaySpeed: preferredReplaySpeed(settings),
    errorMessage: ''
  };
}

export function replaySetSpeedViewState(speed, {
  settings = null,
  allowedSpeeds = DEFAULT_REPLAY_SPEEDS
} = {}) {
  const nextSpeed = allowedSpeeds.includes(Number(speed))
    ? Number(speed)
    : preferredReplaySpeed(settings, { allowedSpeeds });
  return {
    replaySpeed: nextSpeed,
    settings: settings
      ? {
          ...settings,
          replaySpeed: nextSpeed
        }
      : null,
    shouldPersist: Boolean(settings),
    errorMessage: ''
  };
}

export function replayTimelineViewState({
  battle = null,
  replayIndex = 0,
  formatEvent = (event) => event,
  longBattleSpeedBoost = replayLongBattleSpeedBoost
} = {}) {
  const events = runArrayFrom(battle?.events);
  const index = Math.max(0, Math.min(numberOr(replayIndex), Math.max(0, events.length - 1)));
  const activeEvent = events[index] || null;
  const activeDisplay = activeEvent ? formatEvent(activeEvent, index) : null;
  const visibleEvents = events
    .slice(0, index + 1)
    .map((event, eventIndex) => ({
      ...event,
      replayIndex: eventIndex,
      display: formatEvent(event, eventIndex)
    }))
    .reverse();
  const speech = activeDisplay?.speechSide && activeDisplay?.speechText
    ? {
        side: activeDisplay.speechSide,
        narration: activeDisplay.speechText,
        parts: runArrayFrom(activeDisplay.speechParts)
      }
    : null;
  return {
    activeEvent,
    activeDisplay,
    activeSpeech: speech,
    battleStatusText: activeDisplay?.statusText || '',
    replayFinished: events.length > 0 && index >= events.length - 1,
    activeReplayState: activeEvent?.state || null,
    visibleReplayEvents: visibleEvents,
    longBattleSpeedBoost: longBattleSpeedBoost(events.length, index)
  };
}

function patchRunCoins(run, coins) {
  if (!run || coins === undefined) return run || null;
  return {
    ...run,
    player: {
      ...(run.player || {}),
      coins
    }
  };
}

function runShopOfferFrom(response) {
  return Array.isArray(response?.shopOffer) ? response.shopOffer : [];
}

function runShopItemsFrom(items) {
  return Array.isArray(items) ? items : [];
}

function pruneFirstRunItem(items = [], rowId = null, artifactId = null) {
  const list = runShopItemsFrom(items);
  const index = rowId
    ? list.findIndex((item) => item?.id === rowId)
    : list.findIndex((item) => item?.artifactId === artifactId);
  if (index < 0) return list;
  return [
    ...list.slice(0, index),
    ...list.slice(index + 1)
  ];
}

export function runShopRefreshResultViewState(response, {
  run = null
} = {}) {
  return {
    run: patchRunCoins(run, response?.coins),
    shopOffer: runShopOfferFrom(response),
    refreshCount: numberOr(response?.refreshCount),
    errorMessage: ''
  };
}

export function runShopBuyResultViewState(response, {
  run = null,
  containerItems = [],
  freshPurchases = [],
  artifactId = null
} = {}) {
  const boughtArtifactId = response?.artifactId || artifactId;
  const boughtItem = boughtArtifactId
    ? { id: response?.id || null, artifactId: boughtArtifactId }
    : null;
  const currentContainerItems = runShopItemsFrom(containerItems);
  const currentFreshPurchases = runShopItemsFrom(freshPurchases);
  return {
    run: patchRunCoins(run, response?.coins),
    shopOffer: runShopOfferFrom(response),
    containerItems: boughtItem ? [...currentContainerItems, boughtItem] : [...currentContainerItems],
    freshPurchases: boughtArtifactId ? [...currentFreshPurchases, boughtArtifactId] : [...currentFreshPurchases],
    boughtItem,
    errorMessage: ''
  };
}

export function runShopSellResultViewState(response, {
  run = null,
  builderItems = [],
  containerItems = [],
  activeBags = [],
  freshPurchases = [],
  target = null
} = {}) {
  const targetIsObject = target && typeof target === 'object';
  const rowId = response?.id || (targetIsObject ? target.id : null) || null;
  const artifactId = response?.artifactId || (targetIsObject ? target.artifactId : target) || null;
  const currentFreshPurchases = runShopItemsFrom(freshPurchases);
  const freshIndex = currentFreshPurchases.indexOf(artifactId);
  return {
    run: patchRunCoins(run, response?.coins),
    deletedRowId: rowId,
    deletedArtifactId: artifactId,
    builderItems: pruneFirstRunItem(builderItems, rowId, artifactId),
    containerItems: pruneFirstRunItem(containerItems, rowId, artifactId),
    activeBags: pruneFirstRunItem(activeBags, rowId, artifactId),
    freshPurchases: freshIndex >= 0
      ? [
          ...currentFreshPurchases.slice(0, freshIndex),
          ...currentFreshPurchases.slice(freshIndex + 1)
        ]
      : [...currentFreshPurchases],
    errorMessage: ''
  };
}

export function gachaAdminDraftDiffRows(diff) {
  if (!diff || diff.missingBase) return [];
  return [
    ...(diff.changedFields || []).map((change) => ({
      type: 'field',
      field: change.field,
      before: change.before,
      after: change.after
    })),
    ...(diff.addedItems || []).map((assetId) => ({
      type: 'item_added',
      field: assetId,
      before: null,
      after: assetId
    })),
    ...(diff.removedItems || []).map((assetId) => ({
      type: 'item_removed',
      field: assetId,
      before: assetId,
      after: null
    })),
    ...(diff.changedItems || []).map((entry) => ({
      type: 'item_changed',
      field: entry.assetId,
      before: (entry.changes || []).map((change) => change.before),
      after: (entry.changes || []).map((change) => change.after)
    }))
  ];
}

function gachaAdminPositiveNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function formatGachaAdminPercent(value) {
  const numeric = Number(value || 0);
  return `${(numeric * 100).toFixed(numeric > 0 && numeric < 0.01 ? 2 : 1)}%`;
}

export function gachaAdminValidationIssueRows(validation) {
  if (!validation) return [];
  return [
    ...(validation.errors || []).map((issue) => ({ ...issue, severity: 'error' })),
    ...(validation.warnings || []).map((issue) => ({ ...issue, severity: 'warning' }))
  ];
}

export function gachaAdminReleaseChecklistRows(checklist) {
  if (!checklist) return [];
  return [
    ...(checklist.blockers || []),
    ...(checklist.warnings || []),
    ...(checklist.passed || [])
  ];
}

export function gachaAdminPlanTotalWeight(planItems = []) {
  return (planItems || []).reduce(
    (sum, item) => sum + gachaAdminPositiveNumber(item?.dropWeight ?? item?.drop_weight),
    0
  );
}

export function gachaAdminPlanCoverageRows(planItems = [], {
  characters = [],
  targetPerCharacter = 5
} = {}) {
  const target = Number(targetPerCharacter) || 5;
  const byCharacter = new Map();
  for (const item of planItems || []) {
    const characterId = item?.characterId ?? item?.character_id;
    const row = byCharacter.get(characterId) || { count: 0, readyCount: 0, totalWeight: 0 };
    row.count += 1;
    if (item?.status === 'ready') row.readyCount += 1;
    row.totalWeight += gachaAdminPositiveNumber(item?.dropWeight ?? item?.drop_weight);
    byCharacter.set(characterId, row);
  }
  return (characters || []).map((character) => {
    const row = byCharacter.get(character.id) || { count: 0, readyCount: 0, totalWeight: 0 };
    return {
      ...character,
      ...row,
      target,
      missing: Math.max(0, target - row.count),
      enough: row.count >= target
    };
  });
}

export function gachaAdminPlanChanceText(item, {
  totalWeight = null,
  formatPercent = formatGachaAdminPercent
} = {}) {
  const total = gachaAdminPositiveNumber(totalWeight);
  if (!total) return '0.0%';
  return formatPercent(gachaAdminPositiveNumber(item?.dropWeight ?? item?.drop_weight) / total);
}

function gachaAdminOddsRows(source, key) {
  if (Array.isArray(source)) return source;
  if (Array.isArray(source?.[key])) return source[key];
  if (Array.isArray(source?.preview?.[key])) return source.preview[key];
  return [];
}

export function gachaAdminOddsRarityRows(source = null, {
  formatPercent = formatGachaAdminPercent
} = {}) {
  return gachaAdminOddsRows(source, 'raritySummary').map((row) => ({
    ...row,
    expectedText: formatPercent(row?.probability ?? row?.expectedPerOpen ?? 0),
    dropWeightText: row?.dropWeight || '-'
  }));
}

export function gachaAdminOddsItemRows(source = null, {
  limit = 8,
  formatPercent = formatGachaAdminPercent
} = {}) {
  const rows = gachaAdminOddsRows(source, 'items');
  const numericLimit = Number(limit);
  const limitedRows = Number.isInteger(numericLimit) && numericLimit >= 0
    ? rows.slice(0, numericLimit)
    : rows;
  return limitedRows.map((row) => ({
    ...row,
    expectedText: formatPercent(row?.probability || 0),
    dropWeightText: row?.dropWeight ?? '-',
    copyLimitText: row?.copyLimit ?? '-'
  }));
}

export function formatAssetRollResultName(result, {
  localizeName = localizeUnknownName
} = {}) {
  const firstItem = Array.isArray(result?.items) ? result.items[0] : null;
  return localizeName(firstItem?.assetName || result?.assetName) ||
    firstItem?.assetId ||
    result?.assetId ||
    '';
}

export function formatAssetRollResultItemsText(result, {
  localizeName = localizeUnknownName,
  rarityLabel = identity,
  itemSeparator = ' · ',
  resultSeparator = ' | ',
  limit = 3
} = {}) {
  const items = Array.isArray(result?.items) ? result.items : [];
  const named = items
    .map((item) => {
      const name = localizeName(item.assetName) || item.assetId || '';
      const rarity = rarityLabel(item.rarity);
      return [name, rarity].filter(Boolean).join(itemSeparator);
    })
    .filter(Boolean);
  if (!named.length) return '';
  if (named.length <= limit) return named.join(resultSeparator);
  return `${named.slice(0, limit).join(resultSeparator)} +${named.length - limit}`;
}

export function summarizeAssetRollFeedback({
  status = '',
  result = null,
  errorMessage = '',
  labels = {},
  localizeName = localizeUnknownName,
  rarityLabel = identity
} = {}) {
  if (!status) return null;
  if (status === 'rolling') {
    return {
      status,
      title: labels.openingTitle || '',
      text: labels.openingText || ''
    };
  }
  if (status === 'burning') {
    return {
      status,
      title: labels.burnOpeningTitle || '',
      text: labels.burnOpeningText || ''
    };
  }
  if (status === 'success' && result) {
    const itemCount = Array.isArray(result?.items) ? result.items.length : 0;
    const count = numberOr(result.count, itemCount || 1);
    if (count > 1) {
      return {
        status,
        title: fillTemplate(labels.multiResultTitleTemplate || '', { count }),
        text: formatAssetRollResultItemsText(result, { localizeName, rarityLabel })
      };
    }
    return {
      status,
      title: labels.resultTitle || '',
      text: fillTemplate(labels.resultTemplate || '', {
        asset: formatAssetRollResultName(result, { localizeName }),
        rarity: rarityLabel(result.rarity)
      })
    };
  }
  if (status === 'burned' && result) {
    return {
      status: 'success',
      title: labels.burnResultTitle || '',
      text: fillTemplate(labels.burnResultTemplate || '', {
        asset: formatAssetRollResultName(result, { localizeName }),
        rarity: rarityLabel(result.rarity)
      })
    };
  }
  if (status === 'success' || status === 'burned') return null;
  return {
    status,
    title: labels.problemTitle || '',
    text: labels.errors?.[status] || errorMessage || ''
  };
}
