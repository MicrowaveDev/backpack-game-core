import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import {
  decodePngBuffer,
  encodeDeterministicPng,
  fileSha256,
  inputEntriesFromPaths,
  readPngRgba,
  stitchVerticalImages
} from '@microwavedev/backpack-game-core/tooling/image';
import { validateImagePolicy } from '@microwavedev/backpack-game-core/tooling/image-validation';
import { captureTallPage } from '@microwavedev/backpack-game-core/tooling/image-review';
import { parsePositiveLimit, parseMarkdownMatches, selectPendingWork } from '@microwavedev/backpack-game-core/tooling/work-queue';
import { runCommandSequence } from '@microwavedev/backpack-game-core/tooling/release';
import { validateFusionCatalog } from '@microwavedev/backpack-game-core/modules/fusion';
import {
  buildMetadataBundle,
  checkImageDomainProvenance
} from '@microwavedev/backpack-game-core/tooling/provenance';
import {
  formatScriptDocumentationResult,
  validateScriptDocumentation
} from '@microwavedev/backpack-game-core/tooling/commands';
import {
  parseSuiteRunnerArgs,
  runConfiguredSuite
} from '@microwavedev/backpack-game-core/tooling/runners';

test('[tooling/image] deterministic PNGs round-trip and path roots are injected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-image-'));
  try {
    const filePath = path.join(root, 'assets', 'pixel.png');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const rgba = Buffer.from([10, 20, 30, 255]);
    const first = encodeDeterministicPng({ width: 1, height: 1, rgba });
    const second = encodeDeterministicPng({ width: 1, height: 1, rgba });
    assert.deepEqual(first, second);
    fs.writeFileSync(filePath, first);
    assert.deepEqual(readPngRgba(filePath), { width: 1, height: 1, rgba });
    assert.equal(inputEntriesFromPaths([{ id: 'pixel', filePath }], { root })[0].path, 'assets/pixel.png');
    assert.equal(fileSha256(filePath).length, 64);
    const invalid = path.join(root, 'invalid.png');
    fs.writeFileSync(invalid, 'not png');
    assert.throws(() => readPngRgba(invalid), /not a PNG/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('[tooling/image] decodes buffers and stitches RGBA images vertically', () => {
  const top = { width: 1, height: 1, rgba: Buffer.from([1, 2, 3, 255]) };
  const bottom = { width: 1, height: 1, rgba: Buffer.from([4, 5, 6, 255]) };
  assert.deepEqual(decodePngBuffer(encodeDeterministicPng(top)), top);
  assert.deepEqual(stitchVerticalImages([top, bottom]), {
    width: 1,
    height: 2,
    rgba: Buffer.concat([top.rgba, bottom.rgba])
  });
  assert.throws(() => stitchVerticalImages([{ ...top, width: 2 }, bottom]), /same width/);
  assert.throws(() => decodePngBuffer(encodeDeterministicPng(top).subarray(0, 20)), /truncated PNG chunk/);
});

test('[tooling/image-validation] applies neutral dimension, alpha, and margin policy', () => {
  const image = { width: 2, height: 2, rgba: Buffer.from([
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 10, 20, 30, 255
  ]) };
  const result = validateImagePolicy(image, { width: 3, height: 3, minCoverage: 0.5, minMargin: 1 });
  assert.deepEqual(result.issues.map((issue) => issue.code), ['dimensions', 'coverage', 'margin']);
  assert.equal(result.stats.coverage, 0.25);
});

test('[tooling/image-review] captures and stitches injected browser page tiles', async () => {
  const colors = [Buffer.from([1, 2, 3, 255]), Buffer.from([4, 5, 6, 255])];
  let call = 0;
  const page = {
    async screenshot({ clip }) {
      return encodeDeterministicPng({
        width: clip.width,
        height: clip.height,
        rgba: Buffer.concat(Array(clip.width * clip.height).fill(colors[call++]))
      });
    }
  };
  const image = await captureTallPage({ page, width: 1, height: 2, tileHeight: 1 });
  assert.deepEqual(image.rgba, Buffer.concat(colors));
});

test('[tooling/work-queue] parses configured queues without product language', () => {
  assert.equal(parsePositiveLimit(['--limit=4']), 4);
  assert.equal(parsePositiveLimit(['--limit=nope'], { defaultLimit: 8 }), 8);
  const parsed = parseMarkdownMatches('- `one`: first\n- `two`: second', /^- `([^`]+)`: (.+)$/gm, (match) => [match[1], match[2]]);
  assert.equal(parsed.get('two'), 'second');
  assert.throws(() => parseMarkdownMatches('- `one`: first\n- `one`: second', /^- `([^`]+)`: (.+)$/gm, (match) => [match[1], match[2]]), /duplicate work id one/);
  assert.deepEqual(selectPendingWork([1, 2, 3, 4], { isPending: (value) => value % 2 === 0, limit: 1 }), [2]);
});

test('[tooling/release] runs configured commands in order and stops on failure', async () => {
  const calls = [];
  const spawnProcess = (command) => {
    calls.push(command);
    const child = new EventEmitter();
    queueMicrotask(() => child.emit('exit', command === 'bad' ? 2 : 0, null));
    return child;
  };
  await assert.rejects(() => runCommandSequence([['one'], ['bad'], ['never']], {
    spawnProcess,
    logger: { log() {} }
  }), /failed with code 2/);
  assert.deepEqual(calls, ['one', 'bad']);
});

test('[modules/fusion] validates catalog integrity through injected eligibility policy', () => {
  const artifacts = [
    { id: 'a' }, { id: 'b' }, { id: 'result', fusionOnly: true }, { id: 'orphan', fusionOnly: true }
  ];
  const issues = validateFusionCatalog({
    artifacts,
    recipes: [{ id: 'recipe', ingredientArtifactIds: ['a', 'b'], resultArtifactId: 'result' }],
    isIngredientEligible: (artifact) => artifact.id !== 'b'
  });
  assert.deepEqual(issues.map((issue) => issue.code), ['ineligible-ingredient', 'unreferenced-result']);
  assert.equal(validateFusionCatalog({ artifacts: [{ id: 'same' }, { id: 'same' }] })[0].code, 'duplicate-artifact');
});

test('[tooling/provenance] validates injected roots and reports malformed metadata', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-provenance-'));
  try {
    const outputPath = 'assets/approved.png';
    const absolutePath = path.join(root, outputPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, encodeDeterministicPng({
      width: 1,
      height: 1,
      rgba: Buffer.from([1, 2, 3, 255])
    }));
    const entry = {
      id: 'approved',
      status: 'approved',
      outputPath,
      png: { sha256: fileSha256(absolutePath) },
      validation: { status: 'passed' },
      review: { decision: 'approved' }
    };
    const metadata = buildMetadataBundle({
      status: 'approved',
      policy: { runtimeUsesApprovedOnly: true },
      entries: [entry]
    });
    const metadataPath = path.join(root, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));
    const failures = [];
    assert.equal(checkImageDomainProvenance({
      metadataPath,
      repoRoot: root,
      onFailure: (message) => failures.push(message)
    }).length, 1);
    assert.deepEqual(failures, []);

    fs.writeFileSync(metadataPath, JSON.stringify({ ...metadata, entryCount: 4 }));
    checkImageDomainProvenance({
      metadataPath,
      repoRoot: root,
      onFailure: (message) => failures.push(message)
    });
    assert.match(failures.at(-1), /does not match entries/);
    assert.throws(() => checkImageDomainProvenance({
      metadataPath: path.join(root, 'missing.json'),
      repoRoot: root,
      onFailure() {}
    }), /Missing image metadata/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('[tooling/commands] validates configured manifests without product assumptions', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'core-commands-'));
  try {
    const scriptsRoot = path.join(root, 'app', 'scripts');
    fs.mkdirSync(path.join(scriptsRoot, 'checks'), { recursive: true });
    fs.writeFileSync(path.join(scriptsRoot, 'checks', 'check.js'), '');
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { check: 'node app/scripts/checks/check.js' } }));
    fs.writeFileSync(path.join(scriptsRoot, 'command-manifest.json'), JSON.stringify({
      directories: [{ id: 'checks', purpose: 'Checks', entryPoints: true }],
      families: [{ id: 'quality', commands: ['check'] }],
      compatibilityAliases: []
    }));
    fs.writeFileSync(path.join(scriptsRoot, 'README.md'), '<!-- command-family:quality -->\n`npm run check`\n');
    const result = validateScriptDocumentation({
      packageJsonPath: path.join(root, 'package.json'),
      manifestPath: path.join(scriptsRoot, 'command-manifest.json'),
      readmePath: path.join(scriptsRoot, 'README.md')
    });
    assert.deepEqual(result.errors, []);
    assert.match(formatScriptDocumentationResult(result), /1 commands in 1 families/);
    fs.writeFileSync(path.join(scriptsRoot, 'command-manifest.json'), JSON.stringify({
      directories: [{ id: 'checks', purpose: 'Checks', entryPoints: true }],
      families: [{ id: 'quality', commands: ['missing'] }],
      compatibilityAliases: []
    }));
    assert.ok(validateScriptDocumentation({
      packageJsonPath: path.join(root, 'package.json'),
      manifestPath: path.join(scriptsRoot, 'command-manifest.json'),
      readmePath: path.join(scriptsRoot, 'README.md')
    }).errors.length >= 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('[tooling/runners] parses configured suites and forwards child exit state', () => {
  assert.deepEqual(parseSuiteRunnerArgs(['--suite=visual', '--debug'], {
    suites: { all: [], visual: ['visual.spec.js'] },
    defaultSuite: 'all',
    extraFlags: ['debug']
  }), { suite: 'visual', help: false, debug: true });
  assert.throws(() => parseSuiteRunnerArgs(['--suite=missing'], {
    suites: { all: [] },
    defaultSuite: 'all'
  }), /Unknown suite/);

  const child = new EventEmitter();
  let exitState;
  const returned = runConfiguredSuite({
    command: 'runner',
    args: ['test'],
    cwd: '/tmp',
    spawnProcess(command, args, options) {
      assert.equal(command, 'runner');
      assert.deepEqual(args, ['test']);
      assert.equal(options.cwd, '/tmp');
      return child;
    },
    onExit(state) { exitState = state; }
  });
  assert.equal(returned, child);
  child.emit('exit', 2, null);
  assert.deepEqual(exitState, { code: 2, signal: null });
  child.emit('exit', null, 'SIGTERM');
  assert.deepEqual(exitState, { code: null, signal: 'SIGTERM' });
});
