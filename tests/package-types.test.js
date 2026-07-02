import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
}

test('[package-types] package exposes TypeScript declarations for every export', () => {
  const manifest = readPackageJson();

  assert.equal(manifest.types, './src/index.d.ts');
  assert.ok(fs.existsSync(path.join(repoRoot, manifest.types)), 'top-level package types target must exist');

  for (const [specifier, entry] of Object.entries(manifest.exports)) {
    assert.equal(typeof entry, 'object', `${specifier} export should use condition map`);
    assert.match(entry.import, /\.js$/, `${specifier} import target should be JavaScript`);
    assert.match(entry.types, /\.d\.ts$/, `${specifier} types target should be a declaration file`);
    assert.ok(
      fs.existsSync(path.join(repoRoot, entry.import)),
      `${specifier} import target missing: ${entry.import}`
    );
    assert.ok(
      fs.existsSync(path.join(repoRoot, entry.types)),
      `${specifier} types target missing: ${entry.types}`
    );
  }
});
