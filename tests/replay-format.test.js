import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatReplayEvent,
  getReplayCombatantName
} from '../src/client/index.js';

test('[client/replay-format] prefers neutral character ids and preserves legacy mushroom ids', () => {
  const battle = {
    snapshots: {
      left: { characterId: 'neutral_hero', mushroomId: 'legacy_shadow' },
      right: { mushroomId: 'legacy_rival' }
    }
  };
  const names = {
    neutral_hero: 'Neutral Hero',
    legacy_rival: 'Legacy Rival'
  };
  const resolveName = (id) => names[id] || '';

  assert.equal(getReplayCombatantName(battle, 'left', resolveName), 'Neutral Hero');
  assert.equal(getReplayCombatantName(battle, 'right', resolveName), 'Legacy Rival');
});

test('[client/replay-format] resolves action names with the neutral id and legacy fallback', () => {
  const neutralCalls = [];
  const neutralResult = formatReplayEvent({
    type: 'action',
    actorSide: 'left',
    targetSide: 'right',
    actionName: 'Fallback',
    damage: 5
  }, {
    snapshots: {
      left: { characterId: 'neutral_hero', mushroomId: 'legacy_shadow' },
      right: { mushroomId: 'legacy_rival' }
    }
  }, (id) => id, (id) => {
    neutralCalls.push(id);
    return 'Neutral Strike';
  }, 'en');

  assert.deepEqual(neutralCalls, ['neutral_hero']);
  assert.match(neutralResult.logText, /neutral_hero uses Neutral Strike: 5 damage/);

  const legacyCalls = [];
  formatReplayEvent({
    type: 'action',
    actorSide: 'left',
    targetSide: 'right',
    actionName: 'Fallback',
    damage: 1
  }, {
    snapshots: {
      left: { mushroomId: 'legacy_hero' },
      right: { mushroomId: 'legacy_rival' }
    }
  }, (id) => id, (id) => {
    legacyCalls.push(id);
    return 'Legacy Strike';
  }, 'en');

  assert.deepEqual(legacyCalls, ['legacy_hero']);
});
