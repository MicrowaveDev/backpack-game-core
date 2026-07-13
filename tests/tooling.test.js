import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import {
  encodeDeterministicPng,
  fileSha256,
  inputEntriesFromPaths,
  readPngRgba
} from '@microwavedev/backpack-game-core/tooling/image';
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
