import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ARTIFACT_FAMILY_CAPABILITY,
  DEFAULT_ARTIFACT_FAMILY_CAPABILITIES,
  FAMILY_CAPS,
  contributesStats,
  familyCaps,
  isBag,
  isCombatArtifact,
  isContainerItem
} from '../src/modules/artifacts/capabilities.js';

test('FAMILY_CAPS preserves the default backpack family capabilities', () => {
  assert.equal(FAMILY_CAPS, DEFAULT_ARTIFACT_FAMILY_CAPABILITIES);
  assert.deepEqual(
    Object.keys(FAMILY_CAPS).sort(),
    ['armor', 'bag', 'damage', 'stun']
  );
});

test('familyCaps defaults to damage for unknown families', () => {
  assert.deepEqual(familyCaps('unknown'), FAMILY_CAPS.damage);
});

test('familyCaps accepts game-specific registries and fallback families', () => {
  const familyCapabilities = {
    weapon: { statsInBattle: true, container: true, holdsItems: false },
    belt: { statsInBattle: false, container: true, holdsItems: true }
  };

  assert.deepEqual(
    familyCaps('missing', { familyCapabilities, fallbackFamily: 'weapon' }),
    familyCapabilities.weapon
  );
  assert.deepEqual(
    familyCaps('missing', { familyCapabilities, fallbackFamily: 'unknown' }),
    DEFAULT_ARTIFACT_FAMILY_CAPABILITY
  );
});

test('isBag supports default and capability-driven bag families', () => {
  assert.equal(isBag({ family: 'bag' }), true);
  assert.equal(isBag({ family: 'damage' }), false);
  assert.equal(isBag(null), false);
  assert.equal(isBag(undefined), false);

  const familyCapabilities = {
    weapon: { statsInBattle: true, container: true, holdsItems: false },
    belt: { statsInBattle: false, container: true, holdsItems: true }
  };
  assert.equal(isBag({ family: 'belt' }, { familyCapabilities }), true);
  assert.equal(isBag({ family: 'belt' }, { bagFamily: 'belt' }), true);
});

test('isCombatArtifact follows family stats capabilities', () => {
  assert.equal(isCombatArtifact({ family: 'damage' }), true);
  assert.equal(isCombatArtifact({ family: 'armor' }), true);
  assert.equal(isCombatArtifact({ family: 'stun' }), true);
  assert.equal(isCombatArtifact({ family: 'bag' }), false);
  assert.equal(isCombatArtifact(null), false);

  const familyCapabilities = {
    charm: { statsInBattle: false, container: true, holdsItems: false }
  };
  assert.equal(isCombatArtifact({ family: 'charm' }, { familyCapabilities }), false);
});

test('isContainerItem is true for negative placement coordinates', () => {
  assert.equal(isContainerItem({ x: -1, y: -1 }), true);
  assert.equal(isContainerItem({ x: 0, y: -1 }), true);
  assert.equal(isContainerItem({ x: -1, y: 0 }), true);
  assert.equal(isContainerItem({ x: 0, y: 0 }), false);
  assert.equal(isContainerItem(null), false);
});

test('contributesStats only accepts placed combat-capable items', () => {
  const combat = { family: 'damage' };
  const bag = { family: 'bag' };

  assert.equal(contributesStats(combat, { x: 0, y: 0 }), true);
  assert.equal(contributesStats(combat, { x: -1, y: -1 }), false);
  assert.equal(contributesStats(bag, { x: 0, y: 0 }), false);
  assert.equal(contributesStats(combat, null), false);
});
