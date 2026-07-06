import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRunGhostBudgetPlan,
  createRunGroupCompletionPlan,
  createRunInitialShopStatePlan,
  createRunRoundResolutionPlan,
  createRunRoundShopStatePlan,
  createRunStartPlan,
  createRunStarterLoadoutDrafts,
  shapeRunStateSummary
} from '../src/index.js';

const roundIncome = [5, 5, 5, 6, 6, 7, 7, 8, 8];
const rewardTable = {
  win: { spore: 2, mycelium: 15 },
  loss: { spore: 1, mycelium: 5 }
};

test('[run-lifecycle] plans initial run state without persistence', () => {
  const plan = createRunStartPlan({
    runId: 'run_1',
    mode: 'solo',
    playerId: 'player_1',
    mushroomId: 'thalla',
    runPlayerId: 'grp_1',
    startedAt: '2026-07-05T00:00:00.000Z',
    initialCoins: 5,
    startingLives: 5,
    shopOffer: ['needle', 'plate'],
    shopHasBag: false,
    starterItems: [
      { artifactId: 'spore_needle', x: 0, y: 0, width: 1, height: 1, sortOrder: 0 },
      { artifactId: 'bark_plate', x: 1, y: 0, width: 1, height: 1, sortOrder: 1 }
    ]
  });

  assert.deepEqual(plan.gameRunDraft, {
    id: 'run_1',
    mode: 'solo',
    status: 'active',
    currentRound: 1,
    startedAt: '2026-07-05T00:00:00.000Z'
  });
  assert.equal(plan.playerDraft.livesRemaining, 5);
  assert.equal(plan.playerDraft.coins, 5);
  assert.equal(plan.playerDraft.characterId, 'thalla');
  assert.equal(plan.playerDraft.mushroomId, 'thalla');
  assert.equal(plan.response.characterId, 'thalla');
  assert.equal(plan.response.mushroomId, 'thalla');
  assert.equal(plan.shopStateDraft.roundsSinceBag, 1);
  assert.deepEqual(plan.shopStateDraft.shopOffer, ['needle', 'plate']);
  assert.deepEqual(plan.loadoutDrafts.map((item) => item.artifactId), [
    'starter_bag',
    'spore_needle',
    'bark_plate'
  ]);
  assert.equal(plan.loadoutDrafts[0].active, true);
  assert.equal(plan.loadoutDrafts[1].sortOrder, 1);
});

test('[run-lifecycle] plans starter loadout drafts with an injectable starter bag', () => {
  const drafts = createRunStarterLoadoutDrafts({
    gameRunId: 'run_1',
    playerId: 'player_1',
    starterBag: { artifactId: 'base_pack', width: 4, height: 2 },
    starterItems: [{ artifactId: 'knife', sortOrder: 0 }]
  });

  assert.equal(drafts[0].artifactId, 'base_pack');
  assert.equal(drafts[0].width, 4);
  assert.equal(drafts[1].artifactId, 'knife');
  assert.equal(drafts[1].purchasedRound, 1);
  assert.equal(drafts[1].freshPurchase, false);
});

test('[run-lifecycle] plans initial and next-round shop state', () => {
  assert.deepEqual(createRunInitialShopStatePlan({
    shopOffer: ['bag'],
    hasBag: true,
    initialRoundsSinceBag: 1
  }), {
    roundNumber: 1,
    refreshCount: 0,
    roundsSinceBag: 0,
    shopOffer: ['bag']
  });

  assert.deepEqual(createRunRoundShopStatePlan({
    previousRoundsSinceBag: 3,
    shopOffer: ['needle'],
    hasBag: false
  }), {
    refreshCount: 0,
    roundsSinceBag: 4,
    shopOffer: ['needle']
  });
});

test('[run-lifecycle] plans ghost budget from injected spend and income', () => {
  const roundOne = createRunGhostBudgetPlan({
    playerSpent: 8,
    roundNumber: 1,
    roundIncome,
    ghostBudgetDiscount: 0.12
  });
  assert.equal(roundOne.cumulativeIncome, 5);
  assert.equal(roundOne.graceFactor, 0.7);
  assert.equal(roundOne.ghostBudget, 3);

  const roundThree = createRunGhostBudgetPlan({
    playerSpent: 15,
    roundNumber: 3,
    roundIncome,
    ghostBudgetDiscount: 0.12
  });
  assert.equal(roundThree.cumulativeIncome, 15);
  assert.equal(roundThree.graceFactor, 1);
  assert.equal(roundThree.ghostBudget, 13);
});

test('[run-lifecycle] plans active round resolution counters and rewards', () => {
  const plan = createRunRoundResolutionPlan({
    outcome: 'win',
    roundNumber: 1,
    playerState: {
      completed_rounds: 0,
      wins: 0,
      losses: 0,
      lives_remaining: 5,
      coins: 5
    },
    roundIncome,
    rewardTable,
    rewardMultiplier: 2,
    maxRounds: 9
  });

  assert.equal(plan.status, 'active');
  assert.equal(plan.currentRound, 2);
  assert.equal(plan.nextRound, 2);
  assert.equal(plan.roundIncome, 5);
  assert.deepEqual(plan.rewards, { profileCurrency: 2, characterProgress: 15, spore: 2, mycelium: 15 });
  assert.deepEqual(plan.awards, { profileCurrency: 4, characterProgress: 30, spore: 4, mycelium: 30 });
  assert.deepEqual(plan.player, {
    completedRounds: 1,
    wins: 1,
    losses: 0,
    livesRemaining: 5,
    coins: 10
  });
});

test('[run-lifecycle] accepts neutral character and reward currency keys', () => {
  const startPlan = createRunStartPlan({
    runId: 'run_neutral',
    playerId: 'player_neutral',
    characterId: 'ruby',
    initialCoins: 3,
    startingLives: 2
  });

  assert.equal(startPlan.playerDraft.characterId, 'ruby');
  assert.equal(startPlan.response.characterId, 'ruby');
  assert.equal('mushroomId' in startPlan.playerDraft, false);
  assert.equal('mushroomId' in startPlan.response, false);

  const roundPlan = createRunRoundResolutionPlan({
    outcome: 'win',
    rewardTable: {
      win: { profileCurrency: 3, characterProgress: 8 }
    },
    rewardMultiplier: 2,
    maxRounds: 2
  });

  assert.deepEqual(roundPlan.rewards, {
    profileCurrency: 3,
    characterProgress: 8,
    spore: 3,
    mycelium: 8
  });
  assert.deepEqual(roundPlan.awards, {
    profileCurrency: 6,
    characterProgress: 16,
    spore: 6,
    mycelium: 16
  });
});

test('[run-lifecycle] plans max-loss and max-round completion reasons', () => {
  const eliminated = createRunRoundResolutionPlan({
    outcome: 'loss',
    roundNumber: 4,
    playerState: {
      completedRounds: 3,
      wins: 0,
      losses: 4,
      livesRemaining: 1,
      coins: 2
    },
    roundIncome,
    rewardTable,
    maxRounds: 9
  });
  assert.equal(eliminated.runEnded, true);
  assert.equal(eliminated.endReason, 'max_losses');
  assert.equal(eliminated.currentRound, 4);
  assert.equal(eliminated.player.livesRemaining, 0);

  const fullClear = createRunRoundResolutionPlan({
    outcome: 'win',
    roundNumber: 9,
    playerState: {
      completedRounds: 8,
      wins: 8,
      losses: 0,
      livesRemaining: 5,
      coins: 7
    },
    roundIncome,
    rewardTable,
    maxRounds: 9
  });
  assert.equal(fullClear.runEnded, true);
  assert.equal(fullClear.endReason, 'max_rounds');
  assert.equal(fullClear.roundIncome, 0);
  assert.equal(fullClear.player.wins, 9);
});

test('[run-lifecycle] plans challenge group completion reasons', () => {
  assert.deepEqual(createRunGroupCompletionPlan({
    playerResults: {
      a: { completedRounds: 4, livesRemaining: 0 },
      b: { completedRounds: 4, livesRemaining: 5 }
    },
    maxRounds: 9
  }), {
    runEnded: true,
    endReason: 'max_losses',
    anyEliminated: true,
    allMaxRounds: false
  });

  assert.deepEqual(createRunGroupCompletionPlan({
    playerResults: [
      { completedRounds: 9, livesRemaining: 3 },
      { completedRounds: 9, livesRemaining: 2 }
    ],
    maxRounds: 9
  }), {
    runEnded: true,
    endReason: 'max_rounds',
    anyEliminated: false,
    allMaxRounds: true
  });

  assert.equal(createRunGroupCompletionPlan({
    playerResults: [{ completedRounds: 1, livesRemaining: 5 }],
    maxRounds: 9
  }).runEnded, false);
});

test('[run-lifecycle] shapes run state summaries over injected shop and loadout providers', () => {
  const run = {
    id: 'run_1',
    mode: 'solo',
    status: 'active',
    currentRound: 2,
    characterId: 'ruby',
    playerState: { coins: 7, wins: 1 },
    shopIds: ['knife'],
    loadout: [{ artifactId: 'bag', price: 0 }, { artifactId: 'knife', price: 3 }],
    refreshCount: 1,
    battles: [{
      id: 'battle_1',
      roundNumber: 1,
      outcome: 'win',
      events: [{ type: 'start' }],
      createdAt: '2026-07-05T01:00:00.000Z'
    }],
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T01:00:00.000Z',
    endedAt: null,
    endReason: null
  };
  const summary = shapeRunStateSummary(run, {
    getLoadoutCost: (items) => items.reduce((sum, item) => sum + Number(item.price || 0), 0),
    getLoadoutTotals: (items) => ({ itemCount: items.length }),
    getShopItems: (offer, items, { availableBudget }) => offer.map((artifactId) => ({
      artifactId,
      canAfford: availableBudget >= 3,
      loadoutSize: items.length
    }))
  });

  assert.deepEqual(summary, {
    id: 'run_1',
    mode: 'solo',
    status: 'active',
    currentRound: 2,
    characterId: 'ruby',
    player: { coins: 7, wins: 1 },
    shopOffer: ['knife'],
    shopItems: [{ artifactId: 'knife', canAfford: true, loadoutSize: 2 }],
    loadoutItems: run.loadout,
    loadoutCost: 3,
    loadoutTotals: { itemCount: 2 },
    refreshCount: 1,
    battles: [{
      id: 'battle_1',
      roundNumber: 1,
      outcome: 'win',
      createdAt: '2026-07-05T01:00:00.000Z'
    }],
    lastBattle: run.battles[0],
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T01:00:00.000Z',
    endedAt: null,
    endReason: null
  });
});
