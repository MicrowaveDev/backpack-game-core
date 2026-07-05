import {
  DEFAULT_ASSET_GACHA_SIMULATION_MAX_TRIALS,
  simulateAssetGachaPackOdds
} from './simulation.js';

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function requiredProvider(name, provider) {
  if (typeof provider !== 'function') {
    throw httpError(`Asset gacha simulation service requires ${name}`, 500);
  }
  return provider;
}

function createMissingPackError(packId, createError) {
  return createError('Unknown asset pack', 404, { packId });
}

export function createAssetGachaSimulationService({
  getStaticPack = null,
  getStaticCatalog = null,
  getStaticPackOdds = null,
  getRuntimePack = null,
  getRuntimeCatalog = null,
  shapeRuntimePackOdds = null,
  simulate = simulateAssetGachaPackOdds,
  createError = httpError,
  maxTrials = DEFAULT_ASSET_GACHA_SIMULATION_MAX_TRIALS
} = {}) {
  function simulateResolvedAssetPackOdds(pack, {
    catalog,
    odds,
    source = 'static',
    ...options
  } = {}) {
    return simulate(pack, {
      ...options,
      catalog,
      odds,
      source,
      maxTrials
    });
  }

  function simulateStaticAssetPackOdds(packId, options = {}) {
    const resolvePack = requiredProvider('getStaticPack', getStaticPack);
    const pack = resolvePack(packId);
    if (!pack) throw createMissingPackError(packId, createError);
    const catalog = requiredProvider('getStaticCatalog', getStaticCatalog)();
    const odds = typeof getStaticPackOdds === 'function' ? getStaticPackOdds(pack, { packId, catalog }) : {};
    return simulateResolvedAssetPackOdds(pack, {
      ...options,
      catalog,
      odds,
      source: 'static'
    });
  }

  async function simulateRuntimeAssetPackOdds(packId, {
    planAssetVisibility = 'runtime',
    ...options
  } = {}) {
    const resolvePack = requiredProvider('getRuntimePack', getRuntimePack);
    const pack = await resolvePack(packId);
    if (!pack) throw createMissingPackError(packId, createError);
    const catalog = await requiredProvider('getRuntimeCatalog', getRuntimeCatalog)({ planAssetVisibility, pack });
    const odds = typeof shapeRuntimePackOdds === 'function'
      ? await shapeRuntimePackOdds(pack, { includeAssets: true, catalog, planAssetVisibility })
      : {};
    return simulateResolvedAssetPackOdds(pack, {
      ...options,
      catalog,
      odds,
      source: pack.source || 'runtime'
    });
  }

  return {
    simulateResolvedAssetPackOdds,
    simulateAssetPackOdds: simulateStaticAssetPackOdds,
    simulateRuntimeAssetPackOdds
  };
}

export function createStaticAssetGachaSimulationService({
  getPack,
  getCatalog,
  getPackOdds,
  ...options
} = {}) {
  return createAssetGachaSimulationService({
    ...options,
    getStaticPack: getPack,
    getStaticCatalog: getCatalog,
    getStaticPackOdds: getPackOdds
  });
}

export function createRuntimeAssetGachaSimulationService({
  getPack,
  getCatalog,
  shapePackOdds,
  ...options
} = {}) {
  return createAssetGachaSimulationService({
    ...options,
    getRuntimePack: getPack,
    getRuntimeCatalog: getCatalog,
    shapeRuntimePackOdds: shapePackOdds
  });
}

export function simulateResolvedAssetPackOdds(pack, {
  catalog,
  odds,
  source = 'static',
  ...options
} = {}) {
  return createAssetGachaSimulationService().simulateResolvedAssetPackOdds(pack, {
    catalog,
    odds,
    source,
    ...options
  });
}
