import test from 'node:test';
import assert from 'node:assert/strict';
import {
  artifactFootprintDimensions,
  artifactOwner,
  artifactRoleClass,
  artifactShineTier,
  artifactVisualClassification,
  canonicalArtifactStatKey,
  createArtifactVisualClassifier
} from '@microwavedev/backpack-game-core/artifact-visual-classification';

test('[artifact-visual-classification] classifies generic artifact roles, shine, stats, and footprint', () => {
  const artifact = {
    id: 'heavy_blade',
    family: 'damage',
    width: 1,
    height: 2,
    price: 2,
    bonus: {
      damage: 3,
      armor: -1,
      speed: 1
    },
    characterItem: {
      characterId: 'ruby'
    }
  };

  assert.equal(canonicalArtifactStatKey('stunChance'), 'stun');
  assert.equal(artifactRoleClass(artifact).id, 'damage');
  assert.equal(artifactShineTier(artifact).id, 'signature');
  assert.equal(artifactOwner(artifact), 'ruby');
  assert.deepEqual(artifactFootprintDimensions(artifact), { cols: 1, rows: 2 });

  const visual = artifactVisualClassification(artifact);
  assert.equal(visual.primaryStatKey, 'damage');
  assert.deepEqual(visual.secondaryStats, ['speed']);
  assert.deepEqual(visual.tradeoffs, ['armor']);
  assert.deepEqual(visual.cssClasses, ['artifact-role--damage', 'artifact-shine--signature']);
});

test('[artifact-visual-classification] supports product-provided taxonomy and owner adapters', () => {
  const classifier = createArtifactVisualClassifier({
    roleClasses: {
      meat: {
        id: 'meat',
        label: 'Meat',
        prompt: 'protein role'
      },
      container: {
        id: 'container',
        label: 'Cooler',
        prompt: 'container role'
      }
    },
    shineTiers: {
      plain: { id: 'plain', cssClass: 'plain', prompt: 'plain shine' },
      bright: { id: 'bright', cssClass: 'bright', prompt: 'bright shine' },
      radiant: { id: 'radiant', cssClass: 'radiant', prompt: 'radiant shine' },
      signature: { id: 'signature', cssClass: 'signature', prompt: 'signature shine' }
    },
    primaryStatByRole: {
      meat: 'damage',
      container: null
    },
    defaultRoleId: 'meat',
    bagFamily: 'cooler',
    bagRoleId: 'container',
    familyForArtifact: (artifact) => artifact?.kind || null,
    ownerForArtifact: (artifact) => artifact?.heroId || null,
    shapeForArtifact: (artifact) => artifact?.mask || null,
    radiantPrice: 5,
    brightPrice: 3
  });

  const artifact = {
    id: 'big_cooler',
    kind: 'cooler',
    price: 4,
    heroId: 'grillmaster',
    mask: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    bonus: {
      armor: 2
    }
  };

  const visual = classifier.artifactVisualClassification(artifact);
  assert.equal(visual.role.id, 'container');
  assert.equal(visual.shine.id, 'bright');
  assert.equal(visual.owner, 'grillmaster');
  assert.equal(visual.footprintType, 'wide');
  assert.deepEqual(classifier.artifactFootprintDimensions(artifact), { cols: 3, rows: 2 });
  assert.equal(visual.prompt, 'container role. bright shine.');
});
