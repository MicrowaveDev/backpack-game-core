import test from 'node:test';
import assert from 'node:assert/strict';
import { projectLoadoutItems } from '../src/client/view-model.js';

test('orientation-aware projection preserves rotated stored and placed instances', () => {
  const stored = { id: 'stored', artifactId: 'item', x: -1, y: -1, width: 2, height: 1, rotated: 1 };
  const placed = { ...stored, id: 'placed', x: 1, y: 0 };
  const projected = projectLoadoutItems([stored, placed], [], null, { preserveOrientation: true });
  assert.deepEqual(projected.containerItems, [{ id: 'stored', artifactId: 'item', width: 2, height: 1, rotated: 1 }]);
  assert.equal(projected.builderItems[0].rotated, 1);
  assert.equal(projected.builderItems[0].width, 2);
  assert.deepEqual(projectLoadoutItems([stored]).containerItems, [{ id: 'stored', artifactId: 'item' }]);
});
