export interface SeasonLevel {
  id: string;
  minPoints: number;
  name?: Record<string, string>;
  lore?: Record<string, string>;
  [key: string]: unknown;
}

export interface CurrentSeason {
  id?: string;
  name?: Record<string, string>;
  theme?: Record<string, string>;
  startsAt?: string;
  endsAt?: string;
  resetPolicy?: string;
  [key: string]: unknown;
}

export interface SeasonScoringContext {
  wins?: number;
  losses?: number;
  roundsCompleted?: number;
  endReason?: string | null;
}

export interface SeasonLevelServiceOptions {
  levels?: SeasonLevel[];
  currentSeason?: CurrentSeason;
  seasonEndRewards?: Record<string, unknown>;
  fallbackRewardLevelId?: string;
  maxScoringWins?: number;
  applySeasonPointProtection?: (context: { runPoints: number }) => number;
}

export interface SeasonProgressSummary {
  id: string;
  minPoints: number;
  points: number;
  next: SeasonLevel | null;
  progress: number;
  isMax: boolean;
  raw: SeasonLevel | null;
  runPoints: number;
  totalPoints: number;
  peakPoints: number;
  peakLevelId: string;
  peakName: string;
  seasonName: string;
  seasonTheme: string;
  seasonStartsAt: string;
  seasonEndsAt: string;
  seasonResetPolicy: string;
  name: string;
  lore: string;
  nextName: string;
  pointsToNext: number;
}

export interface SeasonLevelService {
  seasonLevels: SeasonLevel[];
  seasonEndRewards: Record<string, unknown>;
  currentSeason: CurrentSeason;
  calculateSeasonPoints(context?: SeasonScoringContext): number;
  calculateRawSeasonPoints(context?: SeasonScoringContext): number;
  calculateSeasonAbandonPenalty(context?: SeasonScoringContext): number;
  applySeasonPointProtection(context?: { runPoints?: number }): number;
  getSeasonPointsBreakdown(context?: SeasonScoringContext): Record<string, number>;
  seasonLevelRank(levelId: string): number;
  getSeasonEndReward(levelId?: string): unknown;
  getSeasonLevel(points?: number): {
    id: string;
    minPoints: number;
    points: number;
    next: SeasonLevel | null;
    progress: number;
    isMax: boolean;
    raw: SeasonLevel | null;
  };
  getRunSeasonSummary(context?: SeasonScoringContext, lang?: string): SeasonProgressSummary;
  getSeasonProgressSummary(totalPoints?: number, lang?: string, runPoints?: number, peakPoints?: number): SeasonProgressSummary;
}

export interface RunAchievementDefinition {
  id: string;
  name?: Record<string, string>;
  lore?: Record<string, string>;
  criteria?: Record<string, unknown>;
  badgeSymbol?: string;
  [key: string]: unknown;
}

export interface RunAchievementCatalog {
  general?: RunAchievementDefinition[];
  characters?: Record<string, RunAchievementDefinition[]>;
}

export interface DecoratedRunAchievement {
  id: string;
  type: string;
  accent: string;
  characterId: string | null;
  badgeSymbol: string;
  name: string;
  lore: string;
  isNew?: boolean;
}

export interface RunAchievementServiceOptions {
  achievements?: RunAchievementCatalog;
  characterAccents?: Record<string, string>;
  priorityById?: Record<string, number>;
  seasonLevelRank?: (levelId: string) => number;
  seasonLevels?: SeasonLevel[];
  badgeSymbolForAchievement?: (achievement: RunAchievementDefinition & Record<string, unknown>) => string;
  getCharacterId?: (context?: Record<string, unknown>) => string | null | undefined;
  maxNew?: number;
}

export interface RunAchievementService {
  runAchievements: RunAchievementCatalog;
  getRunAchievementById(id: string): (RunAchievementDefinition & Record<string, unknown>) | null;
  getAllRunAchievements(lang?: string): DecoratedRunAchievement[];
  getNextRunAchievementHint(earnedIds?: Array<string | { id?: string }>, lang?: string): DecoratedRunAchievement | null;
  getRunAchievementsByIds(ids?: Array<string | { id?: string; isNew?: boolean }>, lang?: string): DecoratedRunAchievement[];
  getEarnedRunAchievements(context?: Record<string, unknown>, lang?: string, limit?: number): DecoratedRunAchievement[];
  getAwardableRunAchievements(
    context?: Record<string, unknown>,
    lang?: string,
    options?: { alreadyEarnedIds?: Array<string | { id?: string }>; maxNew?: number }
  ): DecoratedRunAchievement[];
}

export const DEFAULT_SEASON_MAX_SCORING_WINS: number;
export const SEASON_MAX_SCORING_WINS: number;
export const MAX_NEW_RUN_ACHIEVEMENTS: number;

export function localized(value: unknown, lang?: string): string;
export function normalizeSeasonLevels(levels?: SeasonLevel[]): SeasonLevel[];
export function calculateSeasonAbandonPenalty(context?: SeasonScoringContext): number;
export function applySeasonPointProtection(context?: { runPoints?: number }, options?: SeasonLevelServiceOptions): number;
export function calculateRawSeasonPoints(context?: SeasonScoringContext, options?: SeasonLevelServiceOptions): number;
export function getSeasonPointsBreakdown(context?: SeasonScoringContext, options?: SeasonLevelServiceOptions): Record<string, number>;
export function calculateSeasonPoints(context?: SeasonScoringContext, options?: SeasonLevelServiceOptions): number;
export function seasonLevelRank(levelId: string, levels?: SeasonLevel[]): number;
export function getSeasonEndReward(levelId?: string, rewards?: Record<string, unknown>, fallbackLevelId?: string): unknown;
export function getSeasonLevel(points?: number, levels?: SeasonLevel[]): ReturnType<SeasonLevelService['getSeasonLevel']>;
export function getSeasonProgressSummary(
  totalPoints?: number,
  lang?: string,
  runPoints?: number,
  peakPoints?: number,
  options?: SeasonLevelServiceOptions
): SeasonProgressSummary;
export function getRunSeasonSummary(context?: SeasonScoringContext, lang?: string, options?: SeasonLevelServiceOptions): SeasonProgressSummary;
export function createSeasonLevelService(options?: SeasonLevelServiceOptions): SeasonLevelService;
export function createRunAchievementService(options?: RunAchievementServiceOptions): RunAchievementService;
