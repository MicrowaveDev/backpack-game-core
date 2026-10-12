import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveCombatantStats } from '@microwavedev/backpack-game-core/modules/battle';
import { deriveCombatantStats as rootDeriveCombatantStats } from '@microwavedev/backpack-game-core';
import { createMushroomBattleEnginePort } from '@microwavedev/backpack-game-core/server/ports/mushroom/gameplay';

const baseStats = Object.freeze({ health: 30, attack: 8, defense: 2, speed: 4, stunChance: 3 });

test('combatant stats public facades expose the same signed bonus calculation', () => {
  assert.equal(rootDeriveCombatantStats, deriveCombatantStats);
  const artifactTotals = Object.freeze({ damage: -1, armor: 2, speed: -1, stunChance: 5 });
  assert.deepEqual(deriveCombatantStats({ baseStats, artifactTotals }), {
    maxHealth: 30, currentHealth: 30, attack: 7, defense: 4, speed: 3, stunChance: 8
  });
  assert.equal(deriveCombatantStats({ baseStats, artifactTotals: { damage: 2 } }).attack, 10);
  assert.deepEqual(deriveCombatantStats({ baseStats }), {
    maxHealth: 30, currentHealth: 30, attack: 8, defense: 2, speed: 4, stunChance: 3
  });
});

test('combatant stats clamp final sums and leave signed totals and policy unchanged', () => {
  const artifactTotals = Object.freeze({ damage: -12, armor: -5, speed: -8, stunChance: 40 });
  const statClamps = Object.freeze({
    attack: Object.freeze({ min: 0 }), defense: Object.freeze({ min: 0 }),
    speed: Object.freeze({ min: 1 }), stunChance: Object.freeze({ min: 0, max: 35 })
  });
  assert.deepEqual(deriveCombatantStats({ baseStats, artifactTotals, statClamps }), {
    maxHealth: 30, currentHealth: 30, attack: 0, defense: 0, speed: 1, stunChance: 35
  });
  // Products that do not request clamps preserve their historical signed totals.
  assert.deepEqual(deriveCombatantStats({ baseStats, artifactTotals }), {
    maxHealth: 30, currentHealth: 30, attack: -4, defense: -3, speed: -4, stunChance: 43
  });
});

test('combatant stats support an explicit health bonus without changing defense bonuses', () => {
  const policy = { healthBonusStat: 'armor', healthBonusClamp: { min: 0 } };
  assert.equal(deriveCombatantStats({ baseStats, artifactTotals: { armor: 4 }, ...policy }).maxHealth, 34);
  const negative = deriveCombatantStats({ baseStats, artifactTotals: { armor: -4 }, ...policy });
  assert.equal(negative.maxHealth, 30);
  assert.equal(negative.currentHealth, 30);
  assert.equal(negative.defense, -2);
  const capped = deriveCombatantStats({ baseStats, artifactTotals: { armor: 4 }, ...policy, statClamps: { maxHealth: { max: 32 } } });
  assert.equal(capped.maxHealth, 32);
  assert.equal(capped.currentHealth, 32);
});

test('Mushroom port retains equipment penalties, base health, and artifact-only stun', () => {
  const port = createMushroomBattleEnginePort({
    getArtifactById: () => null,
    getMushroomById: (id) => ({ id, name: { en: id }, baseStats }),
    buildArtifactSummary: () => ({ damage: -1, armor: 4, speed: -1, stunChance: 5 }),
    createRng: () => () => 0.5, stepCap: 1, maxStunChance: 35
  });
  const snapshot = (mushroomId) => ({ mushroomId, loadout: { items: [] } });
  const battle = port.simulateBattle({ left: snapshot('left'), right: snapshot('right') }, 'stats');
  const state = battle.events.find((event) => event.type === 'battle_start').state;
  for (const side of ['left', 'right']) {
    assert.equal(state[side].maxHealth, 30);
    assert.equal(state[side].currentHealth, 30);
    assert.equal(state[side].attack, 7);
    assert.equal(state[side].defense, 6);
    assert.equal(state[side].speed, 3);
    assert.equal(state[side].stunChance, 5);
  }
});
