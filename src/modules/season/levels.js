export const DEFAULT_SEASON_MAX_SCORING_WINS = 7;
export const SEASON_MAX_SCORING_WINS = DEFAULT_SEASON_MAX_SCORING_WINS;

const EMPTY_SEASON = {
  id: '',
  name: {},
  theme: {},
  startsAt: '',
  endsAt: '',
  resetPolicy: ''
};

export function localized(value, lang = 'en') {
  if (!value || typeof value !== 'object') return value || '';
  return value[lang] || value.en || value.ru || '';
}

export function normalizeSeasonLevels(levels = []) {
  return (Array.isArray(levels) ? levels : [])
    .map((level) => ({
      ...level,
      id: level?.id == null ? '' : String(level.id),
      minPoints: Math.max(0, Number(level?.minPoints || 0))
    }))
    .filter((level) => level.id)
    .sort((a, b) => a.minPoints - b.minPoints);
}

function maxScoringWins(options = {}) {
  const value = Number(options.maxScoringWins ?? DEFAULT_SEASON_MAX_SCORING_WINS);
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_SEASON_MAX_SCORING_WINS;
}

export function calculateSeasonAbandonPenalty({ endReason = null, roundsCompleted = 0 } = {}) {
  if (endReason !== 'abandoned') return 0;
  return Math.max(0, roundsCompleted) > 0 ? -5 : -2;
}

export function applySeasonPointProtection({ runPoints = 0 } = {}, options = {}) {
  if (typeof options.applySeasonPointProtection === 'function') {
    return Number(options.applySeasonPointProtection({ runPoints })) || 0;
  }
  return runPoints;
}

export function calculateRawSeasonPoints(
  { wins = 0, losses = 0, roundsCompleted = 0, endReason = null } = {},
  options = {}
) {
  const scoringWins = Math.min(Math.max(0, wins), maxScoringWins(options));
  const winsPoints = scoringWins * 2;
  const lossesPenalty = Math.max(0, losses) * -1;
  const clearBonus = endReason === 'max_rounds' ? 3 : 0;
  const abandonPenalty = calculateSeasonAbandonPenalty({ endReason, roundsCompleted });
  return winsPoints + lossesPenalty + clearBonus + abandonPenalty;
}

export function getSeasonPointsBreakdown(
  { wins = 0, losses = 0, roundsCompleted = 0, endReason = null } = {},
  options = {}
) {
  const safeWins = Math.max(0, wins);
  const scoringWins = Math.min(safeWins, maxScoringWins(options));
  const cappedWins = Math.max(0, safeWins - scoringWins);
  const winsPoints = scoringWins * 2;
  const lossesPenalty = Math.max(0, losses) * -1;
  const clearBonus = endReason === 'max_rounds' ? 3 : 0;
  const abandonPenalty = calculateSeasonAbandonPenalty({ endReason, roundsCompleted });
  const rawTotal = winsPoints + lossesPenalty + clearBonus + abandonPenalty;
  const total = applySeasonPointProtection({ runPoints: rawTotal }, options);
  return {
    wins: safeWins,
    scoringWins,
    cappedWins,
    losses: Math.max(0, losses),
    roundsCompleted: Math.max(0, roundsCompleted),
    winsPoints,
    lossesPenalty,
    clearBonus,
    abandonPenalty,
    protectionAdjustment: total - rawTotal,
    total
  };
}

export function calculateSeasonPoints(context = {}, options = {}) {
  return getSeasonPointsBreakdown(context, options).total;
}

export function seasonLevelRank(levelId, levels = []) {
  const normalizedLevels = normalizeSeasonLevels(levels);
  const index = normalizedLevels.findIndex((level) => level.id === levelId);
  return index < 0 ? -1 : index;
}

export function getSeasonEndReward(levelId = 'bronze', rewards = {}, fallbackLevelId = 'bronze') {
  return rewards[levelId] || rewards[fallbackLevelId] || null;
}

export function getSeasonLevel(points, levels = []) {
  const normalizedLevels = normalizeSeasonLevels(levels);
  const safePoints = Math.max(0, points || 0);
  if (!normalizedLevels.length) {
    return {
      id: '',
      minPoints: 0,
      points: safePoints,
      next: null,
      progress: 100,
      isMax: true,
      raw: null
    };
  }

  let current = normalizedLevels[0];
  for (const level of normalizedLevels) {
    if (safePoints >= level.minPoints) current = level;
  }
  const currentIndex = normalizedLevels.findIndex((level) => level.id === current.id);
  const next = normalizedLevels[currentIndex + 1] || null;
  const span = next ? next.minPoints - current.minPoints : 1;
  const progress = next
    ? Math.max(0, Math.min(100, Math.round(((safePoints - current.minPoints) / span) * 100)))
    : 100;

  return {
    id: current.id,
    minPoints: current.minPoints,
    points: safePoints,
    next,
    progress,
    isMax: !next,
    raw: current
  };
}

export function getSeasonProgressSummary(
  totalPoints,
  lang = 'en',
  runPoints = 0,
  peakPoints = totalPoints,
  options = {}
) {
  const levels = normalizeSeasonLevels(options.levels);
  const season = options.currentSeason || EMPTY_SEASON;
  const points = Math.max(0, totalPoints || 0);
  const safePeakPoints = Math.max(points, peakPoints || 0);
  const level = getSeasonLevel(points, levels);
  const peakLevel = getSeasonLevel(safePeakPoints, levels);
  return {
    ...level,
    runPoints,
    totalPoints: level.points,
    peakPoints: peakLevel.points,
    peakLevelId: peakLevel.id,
    peakName: localized(peakLevel.raw?.name, lang),
    seasonName: localized(season.name, lang),
    seasonTheme: localized(season.theme, lang),
    seasonStartsAt: season.startsAt || '',
    seasonEndsAt: season.endsAt || '',
    seasonResetPolicy: season.resetPolicy || '',
    name: localized(level.raw?.name, lang),
    lore: localized(level.raw?.lore, lang),
    nextName: level.next ? localized(level.next.name, lang) : '',
    pointsToNext: level.next ? Math.max(0, level.next.minPoints - points) : 0
  };
}

export function getRunSeasonSummary(context = {}, lang = 'en', options = {}) {
  const points = calculateSeasonPoints(context, options);
  return getSeasonProgressSummary(points, lang, points, points, options);
}

export function createSeasonLevelService(options = {}) {
  const levels = normalizeSeasonLevels(options.levels);
  const currentSeason = options.currentSeason || EMPTY_SEASON;
  const seasonEndRewards = options.seasonEndRewards || {};
  const fallbackRewardLevelId = options.fallbackRewardLevelId || levels[0]?.id || 'bronze';
  const boundOptions = {
    levels,
    currentSeason,
    maxScoringWins: options.maxScoringWins,
    applySeasonPointProtection: options.applySeasonPointProtection
  };

  return {
    seasonLevels: levels,
    seasonEndRewards,
    currentSeason,
    calculateSeasonPoints: (context = {}) => calculateSeasonPoints(context, boundOptions),
    calculateRawSeasonPoints: (context = {}) => calculateRawSeasonPoints(context, boundOptions),
    calculateSeasonAbandonPenalty,
    applySeasonPointProtection: (context = {}) => applySeasonPointProtection(context, boundOptions),
    getSeasonPointsBreakdown: (context = {}) => getSeasonPointsBreakdown(context, boundOptions),
    seasonLevelRank: (levelId) => seasonLevelRank(levelId, levels),
    getSeasonEndReward: (levelId = fallbackRewardLevelId) =>
      getSeasonEndReward(levelId, seasonEndRewards, fallbackRewardLevelId),
    getSeasonLevel: (points) => getSeasonLevel(points, levels),
    getRunSeasonSummary: (context = {}, lang = 'en') => getRunSeasonSummary(context, lang, boundOptions),
    getSeasonProgressSummary: (totalPoints, lang = 'en', runPoints = 0, peakPoints = totalPoints) =>
      getSeasonProgressSummary(totalPoints, lang, runPoints, peakPoints, boundOptions)
  };
}
