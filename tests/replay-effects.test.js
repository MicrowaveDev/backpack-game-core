import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BATTLE_EFFECTS,
  STATUS_EFFECTS,
  replayFighterEffects
} from '../src/client/index.js';

test('[client/replay-effects] exposes battle and fighter effect helpers through the client facade', () => {
  assert.equal(STATUS_EFFECTS.stun.className, 'stun');
  assert.equal(BATTLE_EFFECTS.poison.label.en, 'POISON');

  assert.deepEqual(replayFighterEffects({
    event: {
      type: 'action',
      actorSide: 'left',
      targetSide: 'right',
      damage: 4,
      blockedDamage: 2,
      stunned: true
    },
    side: 'right',
    replayState: { right: { stunned: true } },
    replayIndex: 3,
    lang: 'en'
  }), {
    side: 'right',
    key: '3:action:left:right:right',
    classes: ['fighter--hit', 'fighter--blocked', 'fighter--stunned'],
    floatingLabels: [
      { id: 'damage', text: '-4', className: 'damage' },
      { id: 'blocked', text: 'BLOCK', className: 'blocked' },
      { id: 'stun', text: 'STUN', className: 'stun' }
    ],
    statusBadges: [{ label: 'STUN', className: 'stun' }]
  });
});
