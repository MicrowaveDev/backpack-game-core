function requiredDependency(name, value) {
  if (value == null) {
    throw new Error(`Game service port requires ${name}`);
  }
  return value;
}

async function getBootstrapWithDeps(ctx, playerId) {
  const state = await ctx.getPlayerState(playerId);
  const [history, runHistory] = await Promise.all([
    ctx.getBattleHistory(playerId, 10),
    ctx.getGameRunHistory(playerId, 10)
  ]);
  const [dailyUsage, activeGameRuns, runtimeAssetCatalog] = await Promise.all([
    ctx.query(
      `SELECT battle_starts FROM daily_rate_limits WHERE player_id = $1 AND day_key = $2`,
      [playerId, ctx.dayKey(new Date())]
    ),
    ctx.getActiveGameRuns(playerId),
    ctx.getRuntimeAssetCatalog()
  ]);
  const legacyActiveRun = activeGameRuns.find((run) => !run.mushroomId && run.mode === 'solo') || null;
  const normalizedActiveGameRuns = activeGameRuns.map((run) => (
    run === legacyActiveRun && state.activeMushroomId
      ? { ...run, mushroomId: state.activeMushroomId, player: { ...run.player, mushroomId: state.activeMushroomId } }
      : run
  ));
  const activeGameRun = normalizedActiveGameRuns.find((run) => run.mushroomId === state.activeMushroomId) || null;
  const assetPacks = await ctx.getAssetPacksForPlayer(playerId);
  return {
    ...state,
    mushrooms: ctx.mushroomsForResponse(),
    artifacts: ctx.artifacts,
    shopState: null,
    activeGameRun,
    activeGameRuns: normalizedActiveGameRuns,
    battleLimit: {
      used: dailyUsage.rowCount ? Number(dailyUsage.rows[0].battle_starts) : 0,
      limit: ctx.dailyBattleLimit,
      nextResetAt: ctx.nextUtcReset(new Date()).toISOString()
    },
    battleHistory: history,
    gameRunHistory: runHistory,
    homeField: ctx.getHomeFieldConfig(),
    assetCatalog: runtimeAssetCatalog,
    assetPacks,
    assetAcquisition: {
      gachaEnabled: ctx.isAssetGachaEnabled(),
      directBuyPolicy: ctx.directBuyPolicy(),
      activePackIds: assetPacks.filter((pack) => pack.active).map((pack) => pack.id)
    }
  };
}

export function createMushroomGameServicePort(options = {}) {
  const ctx = {
    query: requiredDependency('query', options.query),
    artifacts: requiredDependency('artifacts', options.artifacts),
    dailyBattleLimit: requiredDependency('dailyBattleLimit', options.dailyBattleLimit),
    mushroomsForResponse: requiredDependency('mushroomsForResponse', options.mushroomsForResponse),
    dayKey: requiredDependency('dayKey', options.dayKey),
    nextUtcReset: requiredDependency('nextUtcReset', options.nextUtcReset),
    getBattleHistory: requiredDependency('getBattleHistory', options.getBattleHistory),
    getPlayerState: requiredDependency('getPlayerState', options.getPlayerState),
    getActiveGameRuns: requiredDependency('getActiveGameRuns', options.getActiveGameRuns),
    getGameRunHistory: requiredDependency('getGameRunHistory', options.getGameRunHistory),
    getHomeFieldConfig: requiredDependency('getHomeFieldConfig', options.getHomeFieldConfig),
    directBuyPolicy: requiredDependency('directBuyPolicy', options.directBuyPolicy),
    getAssetPacksForPlayer: requiredDependency('getAssetPacksForPlayer', options.getAssetPacksForPlayer),
    getRuntimeAssetCatalog: requiredDependency('getRuntimeAssetCatalog', options.getRuntimeAssetCatalog),
    isAssetGachaEnabled: requiredDependency('isAssetGachaEnabled', options.isAssetGachaEnabled)
  };

  return {
    getBootstrap: (playerId) => getBootstrapWithDeps(ctx, playerId)
  };
}
