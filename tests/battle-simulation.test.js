import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateBattle } from '../src/index.js';

function combatant(id, stats = {}) {
  const maxHealth = stats.maxHealth ?? 20;
  return {
    id,
    side: stats.side,
    playerId: `${id}_player`,
    name: id,
    maxHealth,
    currentHealth: stats.currentHealth ?? maxHealth,
    baseSpeed: stats.baseSpeed ?? stats.speed ?? 1,
    attack: stats.attack ?? 5,
    speed: stats.speed ?? 1,
    defense: stats.defense ?? 0,
    stunChance: stats.stunChance ?? 0,
    loadout: stats.loadout ?? { items: [] },
    state: stats.state ?? {}
  };
}

function fixedRng(value) {
  return () => value;
}

test('[battle-simulation] resolves a deterministic death battle with event states', () => {
  const result = simulateBattle({
    left: combatant('left', { side: 'left', attack: 9, speed: 3 }),
    right: combatant('right', { side: 'right', attack: 2, speed: 1 }),
    rng: fixedRng(0),
    stepCap: 10
  });

  const end = result.events.at(-1);
  assert.equal(result.winnerSide, 'left');
  assert.equal(result.outcome, 'win');
  assert.equal(result.endReason, 'death');
  assert.equal(end.type, 'battle_end');
  assert.equal(end.state.right.currentHealth, 0);
  assert.equal(result.rightState.currentHealth, 0);
});

test('[battle-simulation] applies speed hooks and equal-base tie hooks', () => {
  const result = simulateBattle({
    left: combatant('steady', { side: 'left', speed: 4, baseSpeed: 4 }),
    right: combatant('tie_breaker', { side: 'right', speed: 4, baseSpeed: 4 }),
    rng: fixedRng(0),
    stepCap: 1,
    breakEqualBaseSpeedTie({ right }) {
      return right;
    }
  });

  const firstAction = result.events.find((event) => event.type === 'action');
  assert.equal(firstAction.actorSide, 'right');
});

test('[battle-simulation] exposes action hooks for product abilities and metadata', () => {
  const left = combatant('hooked', {
    side: 'left',
    attack: 5,
    speed: 3,
    stunChance: 80,
    state: { pendingDamageBuff: 2 }
  });
  const right = combatant('guarded', {
    side: 'right',
    maxHealth: 30,
    attack: 1,
    speed: 1,
    defense: 4,
    state: { firstHitReduction: true }
  });
  const hookCalls = [];

  const result = simulateBattle({
    left,
    right,
    rng: fixedRng(0),
    stepCap: 1,
    maxStunChance: 35,
    prepareAction({ attacker, action }) {
      hookCalls.push('prepare');
      action.actionName = 'Hook Strike';
      action.attackDamage += attacker.state.pendingDamageBuff + 3;
      action.armorIgnore = 1;
    },
    afterDamageCalculated({ defender, damage }) {
      hookCalls.push('damage');
      if (defender.state.firstHitReduction) {
        damage.resolvedDamage -= 2;
      }
    },
    afterDamageApplied({ attacker, defender }) {
      hookCalls.push('applied');
      attacker.state.pendingDamageBuff = 0;
      defender.state.firstHitReduction = false;
    },
    afterStunResolved({ attacker, stun }) {
      hookCalls.push('stun');
      if (stun.applied) attacker.state.pendingDamageBuff = 5;
    },
    afterActionResolved({ defender }) {
      hookCalls.push('resolved');
      defender.defense = Math.max(0, defender.defense - 1);
    },
    getArtifactAttribution() {
      return { damage: [{ artifactId: 'test_blade', value: 3 }] };
    },
    getEffectTags() {
      return [{ id: 'spark', trigger: 'hit' }];
    }
  });

  const action = result.events.find((event) => event.type === 'action' && event.actorSide === 'left');
  assert.equal(action.actionName, 'Hook Strike');
  assert.equal(action.damage, 5);
  assert.equal(action.blockedDamage, 5);
  assert.equal(action.stunned, true);
  assert.deepEqual(action.artifactAttribution.damage, [{ artifactId: 'test_blade', value: 3 }]);
  assert.deepEqual(action.effectTags, [{ id: 'spark', trigger: 'hit' }]);
  assert.equal(action.state.left.stunned, false);
  assert.equal(action.state.right.stunned, true);
  assert.equal(action.state.right.defense, 3);
  assert.deepEqual(hookCalls.slice(0, 5), ['prepare', 'damage', 'applied', 'stun', 'resolved']);
});

test('[battle-simulation] clears stun with one skip action', () => {
  const result = simulateBattle({
    left: combatant('stunned', { side: 'left', speed: 5, state: { stunned: true } }),
    right: combatant('opponent', { side: 'right', speed: 1 }),
    rng: fixedRng(0),
    stepCap: 2
  });

  const skip = result.events.find((event) => event.type === 'skip');
  const laterLeftAction = result.events.find(
    (event) => event.type === 'action' && event.actorSide === 'left' && event.step > skip.step
  );
  assert.equal(skip.actorSide, 'left');
  assert.ok(laterLeftAction, 'stun should clear after one skipped action');
});
