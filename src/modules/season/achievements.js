import { seasonLevelRank as defaultSeasonLevelRank } from './levels.js';

export const MAX_NEW_RUN_ACHIEVEMENTS = 3;

function normalizeAchievements(achievements = {}) {
  return {
    general: Array.isArray(achievements.general) ? achievements.general : [],
    characters: achievements.characters && typeof achievements.characters === 'object'
      ? achievements.characters
      : {}
  };
}

function normalizeEarnedIds(earnedIds = []) {
  return new Set(earnedIds.map((entry) => typeof entry === 'string' ? entry : entry?.id).filter(Boolean));
}

function localized(value, lang = 'en') {
  if (!value || typeof value !== 'object') return value || '';
  return value[lang] || value.en || value.ru || '';
}

function inferBadgeSymbol(achievement, options = {}) {
  if (typeof options.badgeSymbolForAchievement === 'function') {
    const symbol = options.badgeSymbolForAchievement(achievement);
    if (symbol) return symbol;
  }
  if (achievement.type === 'season') {
    if (achievement.id.includes('diamond')) return '*';
    if (achievement.id.includes('gold')) return '*';
    if (achievement.id.includes('silver')) return '*';
    return '*';
  }
  return '*';
}

function allAchievements(achievements = {}, options = {}) {
  const normalized = normalizeAchievements(achievements);
  const characterAccents = options.characterAccents || {};
  return [
    ...normalized.general.map((achievement) => ({
      ...achievement,
      type: achievement.id?.startsWith('season_') ? 'season' : 'general',
      accent: achievement.id?.startsWith('season_') ? achievement.id.replace('season_', '').split('_')[0] : 'general'
    })),
    ...Object.values(normalized.characters).flatMap((list) =>
      (Array.isArray(list) ? list : []).map((achievement) => {
        const characterId = Object.entries(normalized.characters)
          .find(([, characterList]) => characterList?.some((entry) => entry.id === achievement.id))?.[0] || 'character';
        return {
          ...achievement,
          type: 'character',
          characterId,
          accent: characterAccents[characterId] || 'character'
        };
      })
    )
  ];
}

function contextCharacterId(context = {}, options = {}) {
  if (typeof options.getCharacterId === 'function') {
    return options.getCharacterId(context);
  }
  return context.characterId || null;
}

function criteriaMatches(criteria = {}, context = {}, options = {}) {
  const rank = options.seasonLevelRank || ((levelId) => defaultSeasonLevelRank(levelId, options.seasonLevels || []));
  if (criteria.endReason && context.endReason !== criteria.endReason) return false;
  if (criteria.lastOutcome && context.lastOutcome !== criteria.lastOutcome) return false;
  if (criteria.minWins != null && context.wins < criteria.minWins) return false;
  if (criteria.maxWins != null && context.wins > criteria.maxWins) return false;
  if (criteria.minLosses != null && context.losses < criteria.minLosses) return false;
  if (criteria.maxLosses != null && context.losses > criteria.maxLosses) return false;
  if (criteria.minRounds != null && context.roundsCompleted < criteria.minRounds) return false;
  if (criteria.maxRounds != null && context.roundsCompleted > criteria.maxRounds) return false;
  if (criteria.minWinRate != null && context.winRate < criteria.minWinRate) return false;
  if (criteria.maxWinRate != null && context.winRate > criteria.maxWinRate) return false;
  if (criteria.minLivesRemaining != null && context.livesRemaining < criteria.minLivesRemaining) return false;
  if (criteria.maxLivesRemaining != null && context.livesRemaining > criteria.maxLivesRemaining) return false;
  if (criteria.seasonLevel && context.seasonLevel !== criteria.seasonLevel) return false;
  if (criteria.minSeasonLevel && rank(context.seasonLevel) < rank(criteria.minSeasonLevel)) return false;
  if (criteria.maxSeasonLevel && rank(context.seasonLevel) > rank(criteria.maxSeasonLevel)) return false;
  if (criteria.minSeasonPoints != null && context.seasonPoints < criteria.minSeasonPoints) return false;
  if (criteria.maxSeasonPoints != null && context.seasonPoints > criteria.maxSeasonPoints) return false;
  return true;
}

function availableAchievementsForContext(achievements, context, options = {}) {
  const characterId = contextCharacterId(context, options);
  return allAchievements(achievements, options).filter((achievement) => {
    if (achievement.type === 'character' && achievement.characterId !== characterId) return false;
    return criteriaMatches(achievement.criteria, context, options);
  });
}

function achievementPriority(achievement, options = {}) {
  const priorityById = options.priorityById || {};
  return priorityById[achievement.id] ?? 100;
}

function sortForAwarding(options = {}) {
  return (a, b) => {
    const byPriority = achievementPriority(a, options) - achievementPriority(b, options);
    if (byPriority) return byPriority;
    return a.id.localeCompare(b.id);
  };
}

function decorateAchievement(achievement, type, lang, options = {}) {
  return {
    id: achievement.id,
    type,
    accent: achievement.accent || type,
    characterId: achievement.characterId || null,
    badgeSymbol: achievement.badgeSymbol || inferBadgeSymbol(achievement, options),
    name: localized(achievement.name, lang),
    lore: localized(achievement.lore, lang)
  };
}

export function createRunAchievementService(options = {}) {
  const achievements = normalizeAchievements(options.achievements);
  const maxNewDefault = options.maxNew ?? MAX_NEW_RUN_ACHIEVEMENTS;

  function getRunAchievementById(id) {
    return allAchievements(achievements, options).find((achievement) => achievement.id === id) || null;
  }

  function getAllRunAchievements(lang = 'en') {
    return allAchievements(achievements, options)
      .map((achievement) => decorateAchievement(achievement, achievement.type, lang, options));
  }

  function getNextRunAchievementHint(earnedIds = [], lang = 'en') {
    const earned = normalizeEarnedIds(earnedIds);
    const next = allAchievements(achievements, options).find((achievement) => !earned.has(achievement.id));
    return next ? decorateAchievement(next, next.type, lang, options) : null;
  }

  function getRunAchievementsByIds(ids = [], lang = 'en') {
    return ids
      .map((entry) => {
        const id = typeof entry === 'string' ? entry : entry?.id;
        const achievement = getRunAchievementById(id);
        if (!achievement) return null;
        return {
          ...decorateAchievement(achievement, achievement.type, lang, options),
          isNew: typeof entry === 'object' ? Boolean(entry.isNew) : true
        };
      })
      .filter(Boolean);
  }

  function getEarnedRunAchievements(context, lang = 'en', limit = 6) {
    return availableAchievementsForContext(achievements, context, options)
      .sort((a, b) => {
        const priority = { character: 0, season: 1, general: 2 };
        return (priority[a.type] ?? 3) - (priority[b.type] ?? 3);
      })
      .map((achievement) => decorateAchievement(achievement, achievement.type, lang, options))
      .slice(0, limit);
  }

  function getAwardableRunAchievements(context, lang = 'en', {
    alreadyEarnedIds = [],
    maxNew = maxNewDefault
  } = {}) {
    const earned = normalizeEarnedIds(alreadyEarnedIds);
    const matches = availableAchievementsForContext(achievements, context, options).sort(sortForAwarding(options));
    const alreadyEarned = matches.filter((achievement) => earned.has(achievement.id));
    const newAchievements = matches
      .filter((achievement) => !earned.has(achievement.id))
      .slice(0, maxNew);

    return [...newAchievements, ...alreadyEarned]
      .map((achievement) => decorateAchievement(achievement, achievement.type, lang, options));
  }

  return {
    runAchievements: achievements,
    getRunAchievementById,
    getAllRunAchievements,
    getNextRunAchievementHint,
    getRunAchievementsByIds,
    getEarnedRunAchievements,
    getAwardableRunAchievements
  };
}
