import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { encodeDeterministicPng } from '@microwavedev/backpack-game-core/tooling/image';
import {
  composePngFrameGrid,
  findIndexedFiles,
  prepareIndexedPngAnimation
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

test('[tooling/frame-files] prepares indexed animations and validates their contract', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-animation-preparation-'));
  try {
    fs.mkdirSync(path.join(root, 'raw'));
    const frame = { width: 1, height: 1, rgba: Buffer.from([9, 8, 7, 0]) };
    fs.writeFileSync(path.join(root, 'raw', 'spark.frame_1.source.png'), encodeDeterministicPng(frame));
    fs.writeFileSync(path.join(root, 'raw', 'spark.frame_2.source.png'), encodeDeterministicPng(frame));

    const ready = prepareIndexedPngAnimation({
      root,
      sourcePath: 'raw/spark.source.png',
      expectedFrames: 2,
      frameWidth: 1,
      frameHeight: 1,
      outputWidth: 2,
      outputHeight: 1,
      mode: 'copy'
    });
    assert.equal(ready.ok, true);
    assert.equal(ready.kind, 'frames');
    assert.deepEqual({ width: ready.image.width, height: ready.image.height }, { width: 2, height: 1 });

    const wrongCount = prepareIndexedPngAnimation({
      root,
      sourcePath: 'raw/spark.source.png',
      expectedFrames: 3,
      frameWidth: 1,
      frameHeight: 1
    });
    assert.equal(wrongCount.ok, false);
    assert.equal(wrongCount.code, 'frame-count-mismatch');
    assert.match(wrongCount.message, /expected 3 frame files, found 2/);

    const wrongOutput = prepareIndexedPngAnimation({
      root,
      sourcePath: 'raw/spark.source.png',
      expectedFrames: 2,
      frameWidth: 1,
      frameHeight: 1,
      outputWidth: 4,
      outputHeight: 1
    });
    assert.equal(wrongOutput.ok, false);
    assert.equal(wrongOutput.code, 'output-dimensions-mismatch');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('[tooling/frame-files] distinguishes fallback sources from missing animations', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-animation-fallback-'));
  try {
    fs.mkdirSync(path.join(root, 'raw'));
    fs.writeFileSync(path.join(root, 'raw', 'strip.source.png'), 'fallback');
    const options = {
      root,
      sourcePath: 'raw/strip.source.png',
      expectedFrames: 2,
      frameWidth: 1,
      frameHeight: 1
    };
    assert.deepEqual(prepareIndexedPngAnimation(options), {
      ok: true,
      kind: 'fallback',
      sourcePath: 'raw/strip.source.png',
      frameFiles: []
    });
    fs.rmSync(path.join(root, 'raw', 'strip.source.png'));
    const missing = prepareIndexedPngAnimation(options);
    assert.equal(missing.ok, false);
    assert.equal(missing.code, 'frames-and-fallback-missing');
    assert.match(missing.message, /strip\.frame_N\.source\.png/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('[tooling/frame-files] returns frame processing failures as structured results', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-animation-invalid-frame-'));
  try {
    fs.mkdirSync(path.join(root, 'raw'));
    const frame = { width: 1, height: 1, rgba: Buffer.from([9, 8, 7, 255]) };
    fs.writeFileSync(path.join(root, 'raw', 'spark.frame_1.source.png'), encodeDeterministicPng(frame));
    const result = prepareIndexedPngAnimation({
      root,
      sourcePath: 'raw/spark.source.png',
      expectedFrames: 1,
      frameWidth: 2,
      frameHeight: 1
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 'frame-processing-failed');
    assert.match(result.message, /expected 2x1/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
