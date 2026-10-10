function defaultCharacterId(character) {
  return character?.characterId || character?.id || character?.mushroomId || '';
}

export function selectBattleOpponent(characters, {
  playerCharacterId = '',
  previousOpponentId = '',
  rng = Math.random,
  getCharacterId = defaultCharacterId
} = {}) {
  const eligible = (Array.isArray(characters) ? characters : [])
    .filter((character) => {
      const characterId = getCharacterId(character);
      return characterId && characterId !== playerCharacterId;
    });
  if (!eligible.length) return null;

  const fresh = previousOpponentId
    ? eligible.filter((character) => getCharacterId(character) !== previousOpponentId)
    : eligible;
  const pool = fresh.length ? fresh : eligible;
  const roll = Number(rng?.());
  const normalizedRoll = Number.isFinite(roll) ? Math.max(0, Math.min(roll, 0.9999999999999999)) : 0;
  return pool[Math.floor(normalizedRoll * pool.length)];
}
