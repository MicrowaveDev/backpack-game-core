import test from 'node:test';
import assert from 'node:assert/strict';
import { shapeArtifactTileDisplay } from '@microwavedev/backpack-game-core/client-view-model';
import { getEffectiveShape } from '@microwavedev/backpack-game-core/modules/loadout';

const artifact = { id: 'tee', family: 'bag', width: 3, height: 2, shape: [[1, 1, 1], [0, 1, 0]], image: '/tee.png' };
const options = { shapeForArtifact: (item) => item.shape, imageForArtifact: (item) => item.image };

test('rotated shaped Storage figures match placement masks for every quarter turn', () => {
  for (let rotation = 0; rotation < 4; rotation += 1) {
    const shape = getEffectiveShape(artifact, rotation);
    const tile = shapeArtifactTileDisplay(artifact, { ...options, rotation,
      displayWidth: shape[0].length, displayHeight: shape.length });
    assert.equal(tile.width, shape[0].length);
    assert.equal(tile.height, shape.length);
    assert.deepEqual(tile.shape, shape);
    assert.deepEqual(tile.cells.filter((cell) => cell.filled).map((cell) => cell.key),
      shape.flatMap((row, y) => row.flatMap((filled, x) => filled ? [`${x}:${y}`] : [])));
  }
  assert.deepEqual(artifact.shape, [[1, 1, 1], [0, 1, 0]], 'presentation must not mutate canonical shape');
});

test('shaped bag bitmap rotates around its center without changing aspect', () => {
  const quarter = shapeArtifactTileDisplay(artifact, { ...options, rotation: 1 });
  assert.equal(quarter.imageStyle.transform, 'translate(-50%, -50%) rotate(90deg)');
  assert.equal(quarter.imageStyle.transformOrigin, 'center');
  assert.equal(quarter.imageStyle.width, '150%');
  assert.ok(Math.abs(Number.parseFloat(quarter.imageStyle.height) - 200 / 3) < 1e-10);
  const half = shapeArtifactTileDisplay(artifact, { ...options, rotation: 2 });
  assert.equal(half.imageStyle.transform, 'translate(-50%, -50%) rotate(180deg)');
  assert.equal(half.imageStyle.width, '100%');
  assert.equal(half.imageStyle.height, '100%');
});

test('omitting rotation preserves legacy shaped and rectangular presentation', () => {
  assert.deepEqual(shapeArtifactTileDisplay(artifact, options), shapeArtifactTileDisplay(artifact, { ...options, rotation: 0 }));
  const rectangle = { id: 'blade', family: 'weapon', width: 1, height: 2 };
  const tile = shapeArtifactTileDisplay(rectangle, { displayWidth: 2, displayHeight: 1 });
  assert.equal(tile.rotatedImage, true);
  assert.ok(tile.imageClassNames.includes('artifact-figure-bitmap--rotated'));
  assert.equal(tile.imageStyle.transform, undefined);
});
