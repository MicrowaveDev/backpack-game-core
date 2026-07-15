import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { encodeDeterministicPng } from '@microwavedev/backpack-game-core/tooling/image';
import {
  composePngFrameGrid,
  findIndexedFiles
} from '@microwavedev/backpack-game-core/tooling/frame-files';

test('[tooling/frame-files] finds escaped indexed sibling names in numeric order', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-indexed-files-'));
  try {
    const directory = 'raw';
    fs.mkdirSync(path.join(root, directory));
    for (const name of [
      'spark+[x].frame_10.source.png',
      'spark+[x].frame_2.source.png',
      'spark+[x].frame_bad.source.png',
      'other.frame_1.source.png'
    ]) fs.writeFileSync(path.join(root, directory, name), 'fixture');
    assert.deepEqual(findIndexedFiles(directory, {
      root,
      prefix: 'spark+[x].frame_',
      suffix: '.source.png'
    }), [
      { file: path.join(directory, 'spark+[x].frame_2.source.png'), index: 2 },
      { file: path.join(directory, 'spark+[x].frame_10.source.png'), index: 10 }
    ]);
    assert.deepEqual(findIndexedFiles('missing', { root, prefix: 'x' }), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('[tooling/frame-files] loads, resizes, and byte-copies PNG frame grids', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-frame-files-'));
  try {
    const first = { width: 1, height: 1, rgba: Buffer.from([9, 8, 7, 0]) };
    const second = { width: 2, height: 1, rgba: Buffer.from([1, 2, 3, 127, 4, 5, 6, 255]) };
    fs.writeFileSync(path.join(root, 'first.png'), encodeDeterministicPng(first));
    fs.writeFileSync(path.join(root, 'second.png'), encodeDeterministicPng(second));
    const output = composePngFrameGrid(['first.png', 'second.png'], {
      root,
      frameWidth: 2,
      frameHeight: 1,
      resize: 'nearest'
    });
    assert.deepEqual(Array.from(output.rgba), [
      9, 8, 7, 0, 9, 8, 7, 0,
      1, 2, 3, 127, 4, 5, 6, 255
    ]);
    assert.throws(() => composePngFrameGrid(['first.png'], {
      root,
      frameWidth: 2,
      frameHeight: 1
    }), /frame first\.png is 1x1, expected 2x1/);
    assert.throws(() => composePngFrameGrid(['first.png'], {
      root,
      frameWidth: 2,
      frameHeight: 1,
      resize: 'magic'
    }), /frame resize mode/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
