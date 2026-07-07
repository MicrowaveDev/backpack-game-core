import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRunAchievementService,
  createSeasonLevelService
} from '@microwavedev/backpack-game-core/modules/season';

const levels = [
  { id: 'rookie', minPoints: 0, name: { en: 'Rookie' }, lore: { en: 'First steps' } },
  { id: 'pro', minPoints: 20, name: { en: 'Pro' }, lore: { en: 'Getting sharp' } },
  { id: 'legend', minPoints: 50, name: { en: 'Legend' }, lore: { en: 'Peak run' } }
];

const achievements = {
  general: [
    {
      id: 'first_clear',
      name: { en: 'First clear' },
      lore: { en: 'Finish once' },
      criteria: { endReason: 'max_rounds' }
    },
    {
      id: 'season_pro',
      name: { en: 'Pro season' },
      lore: { en: 'Reach pro' },
      criteria: { minSeasonLevel: 'pro' }
    }
  ],
  characters: {
    ruby: [{
      id: 'ruby_win',
      name: { en: 'Ruby win' },
      lore: { en: 'Ruby won' },
      criteria: { minWins: 1 }
    }]
  }
};

test('[season] scores runs and projects progress through product levels', () => {
  const season = createSeasonLevelService({
    levels,
    currentSeason: {
      name: { en: 'Test Season' },
      theme: { en: 'Test theme' },
      startsAt: '2026-07-01',
      endsAt: '2026-07-31',
      resetPolicy: 'monthly'
    },
    seasonEndRewards: {
      rookie: { coins: 1 },
      legend: { coins: 9 }
    },
    fallbackRewardLevelId: 'rookie',
    maxScoringWins: 2
  });

  assert.equal(season.calculateSeasonPoints({
    wins: 4,
    losses: 1,
    roundsCompleted: 4,
    endReason: 'max_rounds'
  }), 6);
  assert.deepEqual(season.getSeasonPointsBreakdown({
    wins: 4,
    losses: 1,
    roundsCompleted: 4,
    endReason: 'max_rounds'
  }), {
    wins: 4,
    scoringWins: 2,
    cappedWins: 2,
    losses: 1,
    roundsCompleted: 4,
    winsPoints: 4,
    lossesPenalty: -1,
    clearBonus: 3,
    abandonPenalty: 0,
    protectionAdjustment: 0,
    total: 6
  });
  assert.equal(season.getSeasonProgressSummary(25, 'en').id, 'pro');
  assert.equal(season.getSeasonProgressSummary(25, 'en').seasonName, 'Test Season');
  assert.deepEqual(season.getSeasonEndReward('missing'), { coins: 1 });
});

test('[season] awards achievements through neutral characterId context', () => {
  const season = createSeasonLevelService({ levels });
  const service = createRunAchievementService({
    achievements,
    characterAccents: { ruby: 'ruby' },
    priorityById: { ruby_win: 10, season_pro: 20, first_clear: 30 },
    seasonLevelRank: season.seasonLevelRank
  });

  const awarded = service.getAwardableRunAchievements({
    characterId: 'ruby',
    endReason: 'max_rounds',
    wins: 1,
    seasonLevel: 'legend',
    seasonPoints: 60
  }, 'en');

  assert.deepEqual(awarded.map((achievement) => achievement.id), [
    'ruby_win',
    'season_pro',
    'first_clear'
  ]);
  assert.equal(awarded[0].characterId, 'ruby');
});
