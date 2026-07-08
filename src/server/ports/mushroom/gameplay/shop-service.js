import {
  createRunShopPurchasePlan,
  createRunShopRefreshPlan,
  createRunShopSellPlan,
  generateShopOffer as generateCoreShopOffer
} from '../../../../shop-offer.js';

function requiredDependency(name, value) {
  if (value == null) {
    throw new Error(`Shop service port requires ${name}`);
  }
  return value;
}

/**
 * Look up the eligible character shop items for a player in a run.
 * [Req 4-Q] Solo: based on active mushroom level.
 * [Req 4-S] Challenge: capped by min(viewerLevel, opponentLevel).
 */
async function lookupEligibleCharacterItemsWithDeps(ctx, client, playerId, mode, gameRunId) {
  const activeResult = await client.query(
    `SELECT mushroom_id FROM player_active_character WHERE player_id = $1`,
    [playerId]
  );
  const mushroomId = activeResult.rowCount ? activeResult.rows[0].mushroom_id : null;
  if (!mushroomId) return [];

  const myceliumResult = await client.query(
    `SELECT mycelium FROM player_mushrooms WHERE player_id = $1 AND mushroom_id = $2`,
    [playerId, mushroomId]
  );
  let level = myceliumResult.rowCount ? ctx.computeCharacterLevel(myceliumResult.rows[0].mycelium).level : 1;

  if (mode === 'challenge') {
    const oppResult = await client.query(
      `SELECT grp.player_id FROM game_run_players grp WHERE grp.game_run_id = $1 AND grp.player_id != $2`,
      [gameRunId, playerId]
    );
    if (oppResult.rowCount) {
      const oppPlayerId = oppResult.rows[0].player_id;
      const oppActiveResult = await client.query(
        `SELECT mushroom_id FROM player_active_character WHERE player_id = $1`,
        [oppPlayerId]
      );
      const oppMushroomId = oppActiveResult.rowCount ? oppActiveResult.rows[0].mushroom_id : null;
      if (oppMushroomId) {
        const oppMyceliumResult = await client.query(
          `SELECT mycelium FROM player_mushrooms WHERE player_id = $1 AND mushroom_id = $2`,
          [oppPlayerId, oppMushroomId]
        );
        const oppLevel = oppMyceliumResult.rowCount
          ? ctx.computeCharacterLevel(oppMyceliumResult.rows[0].mycelium).level
          : 1;
        level = Math.min(level, oppLevel);
      }
    }
  }

  return ctx.getEligibleCharacterItems(mushroomId, level);
}

/**
 * Generate a shop offer with `count` items.
 * @param {Function} rng - Seeded random number generator
 * @param {number} count - Number of items in the offer
 * @param {number} roundsSinceBag - Rounds since a bag last appeared
 * @param {Array} eligibleCharacterItems - [Req 4-R] eligible character shop items;
 *   when non-empty, one slot is reserved for a random character item
 */
function generateShopOfferWithDeps(ctx, rng, count = ctx.shopOfferSize, roundsSinceBag = 1, eligibleCharacterItems = []) {
  return generateCoreShopOffer({
    rng,
    count,
    roundsSinceBag,
    combatItems: ctx.combatArtifacts,
    bagItems: ctx.bags,
    characterItems: eligibleCharacterItems,
    bagBaseChance: ctx.bagBaseChance,
    bagEscalationStep: ctx.bagEscalationStep,
    bagPityThreshold: ctx.bagPityThreshold
  });
}

async function buyRunShopItemWithDeps(ctx, playerId, gameRunId, artifactId) {
  return ctx.withRunLock(gameRunId, () => ctx.withTransaction(async (client) => {
    const runResult = await client.query(
      `SELECT current_round FROM game_runs WHERE id = $1 AND status = 'active'`,
      [gameRunId]
    );
    if (!runResult.rowCount) {
      throw new Error('Game run not found or already ended');
    }
    const currentRound = runResult.rows[0].current_round;

    const grpResult = await client.query(
      `SELECT * FROM game_run_players WHERE game_run_id = $1 AND player_id = $2 AND is_active = 1`,
      [gameRunId, playerId]
    );
    if (!grpResult.rowCount) {
      throw new Error('Player is not part of this active game run');
    }
    const grp = grpResult.rows[0];

    const shopResult = await client.query(
      `SELECT offer_json FROM game_run_shop_states WHERE game_run_id = $1 AND player_id = $2 AND round_number = $3`,
      [gameRunId, playerId, currentRound]
    );
    if (!shopResult.rowCount) {
      throw new Error('Shop state not found');
    }
    const offer = ctx.parseJson(shopResult.rows[0].offer_json, []);

    const artifact = ctx.getArtifactById(artifactId);
    if (!artifact) {
      throw new Error('Unknown artifact');
    }
    const price = ctx.getArtifactPrice(artifact);
    const purchasePlan = createRunShopPurchasePlan({
      coins: grp.coins,
      offer,
      artifactId,
      price
    });
    if (purchasePlan.reason === 'item_not_in_offer') {
      throw new Error('Item is not in the current shop offer');
    }
    if (purchasePlan.reason === 'insufficient_run_currency') {
      throw new Error('Not enough coins');
    }

    const newCoins = purchasePlan.coinsAfter;
    await client.query(
      `UPDATE game_run_players SET coins = $2 WHERE id = $1`,
      [grp.id, newCoins]
    );

    const newOffer = purchasePlan.shopOffer;

    await client.query(
      `UPDATE game_run_shop_states SET offer_json = $2, updated_at = $3
       WHERE game_run_id = $1 AND player_id = $4 AND round_number = $5`,
      [gameRunId, JSON.stringify(newOffer), ctx.nowIso(), playerId, currentRound]
    );

    const sortOrder = await ctx.nextSortOrder(client, gameRunId, playerId, currentRound);
    const newRowId = await ctx.insertLoadoutItem(client, {
      gameRunId,
      playerId,
      roundNumber: currentRound,
      artifactId,
      x: -1,
      y: -1,
      width: artifact.width,
      height: artifact.height,
      sortOrder,
      purchasedRound: currentRound,
      freshPurchase: true
    });

    return { id: newRowId, ...ctx.runCurrencyFields(newCoins), artifactId, price, shopOffer: newOffer };
  }));
}

async function refreshRunShopWithDeps(ctx, playerId, gameRunId) {
  return ctx.withRunLock(gameRunId, () => ctx.withTransaction(async (client) => {
    const runResult = await client.query(
      `SELECT current_round, mode FROM game_runs WHERE id = $1 AND status = 'active'`,
      [gameRunId]
    );
    if (!runResult.rowCount) {
      throw new Error('Game run not found or already ended');
    }
    const currentRound = runResult.rows[0].current_round;
    const runMode = runResult.rows[0].mode;

    const grpResult = await client.query(
      `SELECT * FROM game_run_players WHERE game_run_id = $1 AND player_id = $2 AND is_active = 1`,
      [gameRunId, playerId]
    );
    if (!grpResult.rowCount) {
      throw new Error('Player is not part of this active game run');
    }
    const grp = grpResult.rows[0];

    const shopResult = await client.query(
      `SELECT * FROM game_run_shop_states WHERE game_run_id = $1 AND player_id = $2 AND round_number = $3`,
      [gameRunId, playerId, currentRound]
    );
    if (!shopResult.rowCount) {
      throw new Error('Shop state not found');
    }
    const shop = shopResult.rows[0];

    const cost = ctx.getShopRefreshCost(shop.refresh_count);
    const currentRoundsSinceBag = shop.rounds_since_bag || 1;
    const affordabilityPlan = createRunShopRefreshPlan({
      coins: grp.coins,
      refreshCost: cost,
      refreshCount: shop.refresh_count,
      currentRoundsSinceBag
    });
    if (!affordabilityPlan.ok) {
      throw new Error('Not enough coins to refresh shop');
    }

    const rng = ctx.createRng(`${gameRunId}:refresh:${shop.round_number}:${shop.refresh_count + 1}`);
    const charItems = await lookupEligibleCharacterItemsWithDeps(ctx, client, playerId, runMode, gameRunId);
    const { offer: newOffer, hasBag } = generateShopOfferWithDeps(
      ctx,
      rng,
      ctx.shopOfferSize,
      currentRoundsSinceBag,
      charItems
    );
    const refreshPlan = createRunShopRefreshPlan({
      coins: grp.coins,
      refreshCost: cost,
      refreshCount: shop.refresh_count,
      currentRoundsSinceBag,
      generatedOffer: newOffer,
      hasBag
    });

    await client.query(
      `UPDATE game_run_players SET coins = $2 WHERE id = $1`,
      [grp.id, refreshPlan.coinsAfter]
    );
    await client.query(
      `UPDATE game_run_shop_states SET refresh_count = refresh_count + 1, rounds_since_bag = $2, offer_json = $3, updated_at = $4
       WHERE game_run_id = $1 AND player_id = $5 AND round_number = $6`,
      [gameRunId, refreshPlan.roundsSinceBag, JSON.stringify(refreshPlan.shopOffer), ctx.nowIso(), playerId, currentRound]
    );

    return {
      ...ctx.runCurrencyFields(refreshPlan.coinsAfter),
      shopOffer: refreshPlan.shopOffer,
      refreshCount: refreshPlan.refreshCount,
      refreshCost: refreshPlan.refreshCost
    };
  }));
}

/**
 * Test-only: overwrite the current round's shop offer with a deterministic
 * artifact list. Gated by `NODE_ENV !== 'production'` at the route layer.
 */
async function forceRunShopForTestWithDeps(ctx, playerId, gameRunId, artifactIds) {
  if (!Array.isArray(artifactIds) || artifactIds.length === 0) {
    throw new Error('forceRunShopForTest requires a non-empty artifactIds array');
  }
  for (const id of artifactIds) {
    if (!ctx.getArtifactById(id)) {
      throw new Error(`Unknown artifactId in force-shop: ${id}`);
    }
  }
  return ctx.withRunLock(gameRunId, () => ctx.withTransaction(async (client) => {
    const runResult = await client.query(
      `SELECT current_round FROM game_runs WHERE id = $1 AND status = 'active'`,
      [gameRunId]
    );
    if (!runResult.rowCount) {
      throw new Error('Game run not found or already ended');
    }
    const currentRound = runResult.rows[0].current_round;

    const grpResult = await client.query(
      `SELECT id FROM game_run_players WHERE game_run_id = $1 AND player_id = $2 AND is_active = 1`,
      [gameRunId, playerId]
    );
    if (!grpResult.rowCount) {
      throw new Error('Player is not part of this active game run');
    }

    await client.query(
      `UPDATE game_run_shop_states SET offer_json = $1, updated_at = $2
       WHERE game_run_id = $3 AND player_id = $4 AND round_number = $5`,
      [JSON.stringify(artifactIds), ctx.nowIso(), gameRunId, playerId, currentRound]
    );

    return { shopOffer: artifactIds };
  }));
}

/**
 * Sell a loadout item from the current round.
 */
async function sellRunItemWithDeps(ctx, playerId, gameRunId, target) {
  const { id: targetRowId, artifactId: targetArtifactId } = typeof target === 'string'
    ? { id: null, artifactId: target }
    : { id: target?.id || null, artifactId: target?.artifactId || null };
  if (!targetRowId && !targetArtifactId) {
    throw new Error('sellRunItem requires a row id or artifactId');
  }
  return ctx.withRunLock(gameRunId, () => ctx.withTransaction(async (client) => {
    const runResult = await client.query(
      `SELECT current_round FROM game_runs WHERE id = $1 AND status = 'active'`,
      [gameRunId]
    );
    if (!runResult.rowCount) {
      throw new Error('Game run not found or already ended');
    }
    const currentRound = runResult.rows[0].current_round;

    const grpResult = await client.query(
      `SELECT * FROM game_run_players WHERE game_run_id = $1 AND player_id = $2 AND is_active = 1`,
      [gameRunId, playerId]
    );
    if (!grpResult.rowCount) {
      throw new Error('Player is not part of this active game run');
    }
    const grp = grpResult.rows[0];

    const currentRows = await ctx.readCurrentRoundItems(client, gameRunId, playerId, currentRound);

    let candidate;
    if (targetRowId) {
      candidate = currentRows.find((row) => row.id === targetRowId);
    } else {
      candidate = currentRows.find((row) => row.artifactId === targetArtifactId);
    }
    if (!candidate) {
      throw new Error('Item not found in loadout');
    }

    const resolvedArtifactId = candidate.artifactId;
    const artifact = ctx.getArtifactById(resolvedArtifactId);
    if (ctx.isBag(artifact)) {
      const contents = currentRows.filter((row) => {
        const rowArtifact = ctx.getArtifactById(row.artifactId);
        return !ctx.isBag(rowArtifact)
          && Number(row.x) >= 0
          && Number(row.y) >= 0
          && ctx.bagsContainingItem(row, [candidate]).length > 0;
      });
      if (contents.length > 0) {
        throw new Error('Cannot sell a bag that contains items — empty it first');
      }
    }

    const price = ctx.getArtifactPrice(artifact);
    const sellPlan = createRunShopSellPlan({
      coins: grp.coins,
      price,
      purchasedRound: candidate.purchasedRound,
      currentRound
    });

    let deleted;
    if (targetRowId) {
      deleted = await ctx.deleteLoadoutItemByIdScoped(client, {
        rowId: targetRowId,
        gameRunId,
        playerId,
        roundNumber: currentRound
      });
    } else {
      deleted = await ctx.deleteOneByArtifactId(client, gameRunId, playerId, currentRound, resolvedArtifactId);
    }
    if (!deleted) {
      throw new Error('Item not found in loadout');
    }

    await ctx.insertRefund(client, {
      gameRunId,
      playerId,
      roundNumber: currentRound,
      artifactId: resolvedArtifactId,
      refundAmount: sellPlan.sellPrice
    });

    await client.query(
      `UPDATE game_run_players SET coins = $2 WHERE id = $1`,
      [grp.id, sellPlan.coinsAfter]
    );

    return {
      id: deleted.id,
      ...ctx.runCurrencyFields(sellPlan.coinsAfter),
      sellPrice: sellPlan.sellPrice,
      artifactId: resolvedArtifactId
    };
  }));
}

export function createMushroomShopServicePort(options = {}) {
  const ctx = {
    withTransaction: requiredDependency('withTransaction', options.withTransaction),
    withRunLock: requiredDependency('withRunLock', options.withRunLock),
    bagBaseChance: requiredDependency('bagBaseChance', options.bagBaseChance),
    bagEscalationStep: requiredDependency('bagEscalationStep', options.bagEscalationStep),
    bagPityThreshold: requiredDependency('bagPityThreshold', options.bagPityThreshold),
    bags: requiredDependency('bags', options.bags),
    combatArtifacts: requiredDependency('combatArtifacts', options.combatArtifacts),
    getArtifactById: requiredDependency('getArtifactById', options.getArtifactById),
    getArtifactPrice: requiredDependency('getArtifactPrice', options.getArtifactPrice),
    getEligibleCharacterItems: requiredDependency('getEligibleCharacterItems', options.getEligibleCharacterItems),
    getShopRefreshCost: requiredDependency('getShopRefreshCost', options.getShopRefreshCost),
    shopOfferSize: requiredDependency('shopOfferSize', options.shopOfferSize),
    computeCharacterLevel: requiredDependency('computeCharacterLevel', options.computeCharacterLevel),
    createRng: requiredDependency('createRng', options.createRng),
    nowIso: requiredDependency('nowIso', options.nowIso),
    parseJson: requiredDependency('parseJson', options.parseJson),
    runCurrencyFields: requiredDependency('runCurrencyFields', options.runCurrencyFields),
    isBag: requiredDependency('isBag', options.isBag),
    bagsContainingItem: requiredDependency('bagsContainingItem', options.bagsContainingItem),
    deleteLoadoutItemByIdScoped: requiredDependency(
      'deleteLoadoutItemByIdScoped',
      options.deleteLoadoutItemByIdScoped
    ),
    deleteOneByArtifactId: requiredDependency('deleteOneByArtifactId', options.deleteOneByArtifactId),
    insertLoadoutItem: requiredDependency('insertLoadoutItem', options.insertLoadoutItem),
    insertRefund: requiredDependency('insertRefund', options.insertRefund),
    nextSortOrder: requiredDependency('nextSortOrder', options.nextSortOrder),
    readCurrentRoundItems: requiredDependency('readCurrentRoundItems', options.readCurrentRoundItems)
  };

  return {
    lookupEligibleCharacterItems: (client, playerId, mode, gameRunId) =>
      lookupEligibleCharacterItemsWithDeps(ctx, client, playerId, mode, gameRunId),
    generateShopOffer: (rng, count = ctx.shopOfferSize, roundsSinceBag = 1, eligibleCharacterItems = []) =>
      generateShopOfferWithDeps(ctx, rng, count, roundsSinceBag, eligibleCharacterItems),
    buyRunShopItem: (playerId, gameRunId, artifactId) =>
      buyRunShopItemWithDeps(ctx, playerId, gameRunId, artifactId),
    refreshRunShop: (playerId, gameRunId) =>
      refreshRunShopWithDeps(ctx, playerId, gameRunId),
    forceRunShopForTest: (playerId, gameRunId, artifactIds) =>
      forceRunShopForTestWithDeps(ctx, playerId, gameRunId, artifactIds),
    sellRunItem: (playerId, gameRunId, target) =>
      sellRunItemWithDeps(ctx, playerId, gameRunId, target)
  };
}
