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

function identity(value) {
  return value || '';
}

function numberOr(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function fillTemplate(template, values = {}) {
  return String(template || '').replace(/\{([^}]+)\}/g, (_, key) => values[key] ?? '');
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

function localizeUnknownName(value) {
  if (value && typeof value === 'object') return value.en || Object.values(value)[0] || '';
  return value || '';
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
