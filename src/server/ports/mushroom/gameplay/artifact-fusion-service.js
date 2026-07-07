// Quarantined gameplay port for game_run_fusions — the Mushroom fusion reveal
// table and between-round fusion application service.
//
// This file intentionally preserves current SQL/table behavior while product
// dependencies are injected. It should graduate only after fusion persistence,
// loadout row mutation, catalog lookup, and recipe policy become explicit
// repository/config contracts shared by Mushroom and Meat.

function requiredDependency(name, value) {
  if (value == null) throw new Error(`Artifact fusion port requires ${name}`);
  return value;
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function shapeFusionReveal(row) {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    sourceRoundNumber: row.source_round_number,
    resultRoundNumber: row.result_round_number,
    resultArtifactId: row.result_artifact_id,
    resultRowId: row.result_row_id,
    ingredientArtifactIds: parseJson(row.ingredient_artifact_ids_json, []),
    ingredients: parseJson(row.ingredient_rows_json, [])
  };
}

export function createArtifactFusionPort(options = {}) {
  const query = requiredDependency('query', options.query);
  const getArtifactById = requiredDependency('getArtifactById', options.getArtifactById);
  const createId = requiredDependency('createId', options.createId);
  const nowIso = requiredDependency('nowIso', options.nowIso);
  const findArtifactFusionMatches = requiredDependency('findArtifactFusionMatches', options.findArtifactFusionMatches);
  const readCurrentRoundItems = requiredDependency('readCurrentRoundItems', options.readCurrentRoundItems);
  const nextSortOrder = requiredDependency('nextSortOrder', options.nextSortOrder);
  const deleteLoadoutItem = requiredDependency('deleteLoadoutItem', options.deleteLoadoutItem);
  const insertLoadoutItem = requiredDependency('insertLoadoutItem', options.insertLoadoutItem);

  async function q(client, sql, params) {
    return client ? client.query(sql, params) : query(sql, params);
  }

  async function recordFusionReveal(client, {
    gameRunId,
    playerId,
    sourceRoundNumber,
    resultRoundNumber,
    match,
    resultRowId
  }) {
    const id = createId('grfusion');
    await q(client,
      `INSERT INTO game_run_fusions
         (id, game_run_id, player_id, source_round_number, result_round_number,
          recipe_id, result_artifact_id, result_row_id,
          ingredient_artifact_ids_json, ingredient_rows_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        gameRunId,
        playerId,
        sourceRoundNumber,
        resultRoundNumber,
        match.recipeId,
        match.resultArtifactId,
        resultRowId,
        JSON.stringify(match.ingredientArtifactIds),
        JSON.stringify(match.ingredients),
        nowIso()
      ]
    );
    return id;
  }

  async function applyRoundStartFusions(client, gameRunId, playerId, roundNumber) {
    const rows = await readCurrentRoundItems(client, gameRunId, playerId, roundNumber);
    const matches = findArtifactFusionMatches(rows, getArtifactById);
    if (!matches.length) return [];

    let sortOrder = await nextSortOrder(client, gameRunId, playerId, roundNumber);
    const applied = [];

    for (const match of matches) {
      const resultArtifact = getArtifactById(match.resultArtifactId);
      if (!resultArtifact) continue;

      const ingredientRows = match.ingredientRowIds
        .map((rowId) => rows.find((row) => row.id === rowId))
        .filter(Boolean);
      if (ingredientRows.length !== match.ingredientRowIds.length) continue;

      for (const row of ingredientRows) {
        await deleteLoadoutItem(client, row.id);
      }

      const resultRowId = await insertLoadoutItem(client, {
        gameRunId,
        playerId,
        roundNumber,
        artifactId: resultArtifact.id,
        x: -1,
        y: -1,
        width: resultArtifact.width,
        height: resultArtifact.height,
        sortOrder,
        purchasedRound: roundNumber,
        freshPurchase: false
      });
      sortOrder += 1;

      const revealId = await recordFusionReveal(client, {
        gameRunId,
        playerId,
        sourceRoundNumber: roundNumber - 1,
        resultRoundNumber: roundNumber,
        match,
        resultRowId
      });

      applied.push({
        id: revealId,
        recipeId: match.recipeId,
        sourceRoundNumber: roundNumber - 1,
        resultRoundNumber: roundNumber,
        resultArtifactId: match.resultArtifactId,
        resultRowId,
        ingredientRowIds: match.ingredientRowIds,
        ingredientArtifactIds: match.ingredientArtifactIds,
        ingredients: match.ingredients
      });
    }

    return applied;
  }

  async function readFusionReveals(client, gameRunId, playerId, resultRoundNumber) {
    const result = await q(client,
      `SELECT id, recipe_id, source_round_number, result_round_number, result_artifact_id,
              result_row_id, ingredient_artifact_ids_json, ingredient_rows_json, created_at
       FROM game_run_fusions
       WHERE game_run_id = $1 AND player_id = $2 AND result_round_number = $3
       ORDER BY created_at ASC, id ASC`,
      [gameRunId, playerId, resultRoundNumber]
    );
    return result.rows.map(shapeFusionReveal);
  }

  return {
    applyRoundStartFusions,
    readFusionReveals
  };
}
