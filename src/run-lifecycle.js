function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toNonNegativeInt(value, fallback = 0) {
  return Math.max(0, Math.trunc(toFiniteNumber(value, fallback)));
}

function readField(value, camelKey, snakeKey = null) {
  if (!value || typeof value !== 'object') return null;
  if (value[camelKey] != null) return value[camelKey];
  if (snakeKey && value[snakeKey] != null) return value[snakeKey];
  return null;
}

function cloneOffer(offer = []) {
  return Array.isArray(offer) ? [...offer] : [];
}

function normalizeStarterBag(starterBag = {}) {
  return {
    artifactId: starterBag.artifactId || 'starter_bag',
    x: toFiniteNumber(starterBag.x, 0),
    y: toFiniteNumber(starterBag.y, 0),
    width: toFiniteNumber(starterBag.width, 3),
    height: toFiniteNumber(starterBag.height, 3),
    active: starterBag.active !== false,
    rotated: toNonNegativeInt(starterBag.rotated, 0),
    sortOrder: toNonNegativeInt(starterBag.sortOrder, 0),
    purchasedRound: toNonNegativeInt(starterBag.purchasedRound, 1) || 1,
    freshPurchase: Boolean(starterBag.freshPurchase)
  };
}

export function createRunInitialShopStatePlan({
  shopOffer = [],
  hasBag = false,
  initialRoundsSinceBag = 1,
  refreshCount = 0
} = {}) {
  const roundsSinceBag = toNonNegativeInt(initialRoundsSinceBag, 1);
  return {
    roundNumber: 1,
    refreshCount: toNonNegativeInt(refreshCount, 0),
    roundsSinceBag: hasBag ? 0 : roundsSinceBag,
    shopOffer: cloneOffer(shopOffer)
  };
}

export function createRunRoundShopStatePlan({
  previousRoundsSinceBag = 1,
  shopOffer = [],
  hasBag = false
} = {}) {
  const newRoundsSinceBag = toNonNegativeInt(previousRoundsSinceBag, 1) + 1;
  return {
    refreshCount: 0,
    roundsSinceBag: hasBag ? 0 : newRoundsSinceBag,
    shopOffer: cloneOffer(shopOffer)
  };
}

export function createRunStarterLoadoutDrafts({
  gameRunId = null,
  playerId = null,
  roundNumber = 1,
  starterBag = {},
  starterItems = []
} = {}) {
  const normalizedRound = toNonNegativeInt(roundNumber, 1) || 1;
  const bag = normalizeStarterBag(starterBag);
  const drafts = [{
    gameRunId,
    playerId,
    roundNumber: normalizedRound,
    ...bag
  }];

  for (const [index, item] of Array.from(starterItems || []).entries()) {
    drafts.push({
      gameRunId,
      playerId,
      roundNumber: normalizedRound,
      artifactId: item.artifactId,
      x: toFiniteNumber(item.x, 0),
      y: toFiniteNumber(item.y, 0),
      width: toFiniteNumber(item.width, 1),
      height: toFiniteNumber(item.height, 1),
      active: Boolean(item.active),
      rotated: toNonNegativeInt(item.rotated, 0),
      sortOrder: item.sortOrder == null ? index + 1 : toNonNegativeInt(item.sortOrder, index) + 1,
      purchasedRound: toNonNegativeInt(item.purchasedRound, normalizedRound) || normalizedRound,
      freshPurchase: Boolean(item.freshPurchase)
    });
  }

  return drafts;
}

export function createRunStartPlan({
  runId = null,
  mode = 'solo',
  playerId = null,
  mushroomId = null,
  runPlayerId = null,
  startedAt = null,
  initialCoins = 0,
  startingLives = 0,
  shopOffer = [],
  shopHasBag = false,
  initialRoundsSinceBag = 1,
  starterBag = {},
  starterItems = []
} = {}) {
  const currentRound = 1;
  const coins = toFiniteNumber(initialCoins, 0);
  const livesRemaining = toNonNegativeInt(startingLives, 0);
  const shopStateDraft = createRunInitialShopStatePlan({
    shopOffer,
    hasBag: shopHasBag,
    initialRoundsSinceBag
  });
  const loadoutDrafts = createRunStarterLoadoutDrafts({
    gameRunId: runId,
    playerId,
    roundNumber: currentRound,
    starterBag,
    starterItems
  });
  const playerDraft = {
    id: runPlayerId,
    gameRunId: runId,
    playerId,
    mushroomId,
    isActive: true,
    completedRounds: 0,
    wins: 0,
    losses: 0,
    livesRemaining,
    coins
  };

  return {
    gameRunDraft: {
      id: runId,
      mode,
      status: 'active',
      currentRound,
      startedAt
    },
    playerDraft,
    shopStateDraft,
    loadoutDrafts,
    response: {
      id: runId,
      mode,
      status: 'active',
      mushroomId,
      currentRound,
      startedAt,
      endedAt: null,
      endReason: null,
      shopOffer: shopStateDraft.shopOffer,
      starterItems: Array.from(starterItems || []),
      player: playerDraft
    }
  };
}

export function createRunGhostBudgetPlan({
  playerSpent = 0,
  roundNumber = 1,
  roundIncome = [],
  ghostBudgetDiscount = 0,
  floor = 3
} = {}) {
  const normalizedRound = Math.max(1, toNonNegativeInt(roundNumber, 1));
  const income = Array.isArray(roundIncome) ? roundIncome : [];
  const cumulativeIncome = income
    .slice(0, normalizedRound)
    .reduce((sum, value) => sum + toFiniteNumber(value, 0), 0);
  const graceFactor = normalizedRound === 1 ? 0.7 : normalizedRound === 2 ? 0.85 : 1;
  const base = Math.min(toFiniteNumber(playerSpent, 0), cumulativeIncome) *
    (1 - toFiniteNumber(ghostBudgetDiscount, 0));
  const ghostBudget = Math.max(toNonNegativeInt(floor, 3), Math.floor(base * graceFactor));
  return {
    playerSpent: toFiniteNumber(playerSpent, 0),
    roundNumber: normalizedRound,
    cumulativeIncome,
    graceFactor,
    base,
    ghostBudget
  };
}

export function createRunRoundResolutionPlan({
  outcome,
  roundNumber = 1,
  playerState = {},
  roundIncome = [],
  rewardTable = {},
  rewardMultiplier = 1,
  maxRounds = 1
} = {}) {
  const normalizedRound = Math.max(1, toNonNegativeInt(roundNumber, 1));
  const normalizedMaxRounds = Math.max(1, toNonNegativeInt(maxRounds, 1));
  const rewards = rewardTable?.[outcome] || { spore: 0, mycelium: 0 };
  const multiplier = toFiniteNumber(rewardMultiplier, 1);
  const completedRoundsBefore = toNonNegativeInt(readField(playerState, 'completedRounds', 'completed_rounds'), 0);
  const winsBefore = toNonNegativeInt(readField(playerState, 'wins'), 0);
  const lossesBefore = toNonNegativeInt(readField(playerState, 'losses'), 0);
  const livesBefore = toNonNegativeInt(readField(playerState, 'livesRemaining', 'lives_remaining'), 0);
  const coinsBefore = toFiniteNumber(readField(playerState, 'coins'), 0);
  const roundIncomeAmount = normalizedRound < normalizedMaxRounds && Array.isArray(roundIncome)
    ? toFiniteNumber(roundIncome[normalizedRound], 0)
    : 0;

  const loss = outcome === 'loss';
  const win = outcome === 'win';
  const completedRounds = completedRoundsBefore + 1;
  const wins = win ? winsBefore + 1 : winsBefore;
  const losses = loss ? lossesBefore + 1 : lossesBefore;
  const livesRemaining = loss ? livesBefore - 1 : livesBefore;
  const coins = coinsBefore + roundIncomeAmount;
  const runEnded = livesRemaining <= 0 || completedRounds >= normalizedMaxRounds;
  const endReason = runEnded
    ? (livesRemaining <= 0 ? 'max_losses' : 'max_rounds')
    : null;

  return {
    outcome,
    roundNumber: normalizedRound,
    rewards: {
      spore: toFiniteNumber(rewards.spore, 0),
      mycelium: toFiniteNumber(rewards.mycelium, 0)
    },
    awards: {
      spore: toFiniteNumber(rewards.spore, 0) * multiplier,
      mycelium: toFiniteNumber(rewards.mycelium, 0) * multiplier
    },
    roundIncome: roundIncomeAmount,
    player: {
      completedRounds,
      wins,
      losses,
      livesRemaining,
      coins
    },
    runEnded,
    endReason,
    status: runEnded ? 'completed' : 'active',
    currentRound: runEnded ? normalizedRound : normalizedRound + 1,
    nextRound: runEnded ? null : normalizedRound + 1
  };
}

export function createRunGroupCompletionPlan({
  playerResults = [],
  maxRounds = 1
} = {}) {
  const players = Array.isArray(playerResults)
    ? playerResults
    : Object.values(playerResults || {});
  const normalizedMaxRounds = Math.max(1, toNonNegativeInt(maxRounds, 1));
  const anyEliminated = players.some((player) =>
    toFiniteNumber(readField(player, 'livesRemaining', 'lives_remaining'), 0) <= 0
  );
  const allMaxRounds = players.length > 0 && players.every((player) =>
    toNonNegativeInt(readField(player, 'completedRounds', 'completed_rounds'), 0) >= normalizedMaxRounds
  );
  const runEnded = anyEliminated || allMaxRounds;
  return {
    runEnded,
    endReason: runEnded ? (anyEliminated ? 'max_losses' : 'max_rounds') : null,
    anyEliminated,
    allMaxRounds
  };
}
