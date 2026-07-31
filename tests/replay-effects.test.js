import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BATTLE_EFFECTS,
  STATUS_EFFECTS,
  replayFighterEffects,
  replayFighterVisualState
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

test('[client/replay-effects] classifies fighter visual states by structured event priority', () => {
  assert.equal(replayFighterVisualState({
    event: { type: 'action', actorSide: 'left', targetSide: 'right' },
    side: 'left'
  }), 'attack');
  assert.equal(replayFighterVisualState({
    event: { type: 'action', targetSide: 'right', damage: 3, blockedDamage: 2 },
    side: 'right'
  }), 'blocked');
  assert.equal(replayFighterVisualState({
    event: { type: 'action', targetSide: 'right', damage: 3, blockedDamage: 2, stunned: true },
    side: 'right'
  }), 'stunned');
  assert.equal(replayFighterVisualState({
    event: { type: 'skip', actorSide: 'left' },
    side: 'left'
  }), 'stunned');
  assert.equal(replayFighterVisualState({
    event: { type: 'battle_end', winnerSide: 'right' },
    side: 'right'
  }), 'victory');
  assert.equal(replayFighterVisualState({
    event: { type: 'battle_end', winnerSide: 'right' },
    side: 'left'
  }), 'defeat');
  assert.equal(replayFighterVisualState({
    event: { type: 'step_start' },
    side: 'left',
    replayState: { left: { stunned: true } }
  }), 'stunned');
});
