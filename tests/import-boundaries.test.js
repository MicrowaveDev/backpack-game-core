import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(repoRoot, 'src');

function sourceFiles(dir = srcRoot) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    if (!entry.isFile() || !/\.(js|d\.ts)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function rel(file) {
  return path.relative(repoRoot, file);
}

const quarantinedMushroomPortFiles = new Set([
  'src/server/ports/mushroom/gameplay/game-run-loadout.js',
  'src/server/ports/mushroom/gameplay/index.d.ts',
  'src/server/ports/mushroom/gameplay/index.js'
]);

const forbiddenProductPatterns = [
  /\bmushroom-master\b/i,
  /\bmeat-master\b/i,
  /(?:^|['"])web\/src\//,
  /(?:^|['"])app\/server\//,
  /(?:^|['"])app\/shared\//,
  /(?:^|['"])src\/data\//,
  /(?:^|['"])web\/public\//,
  /\bexpress\b/,
  /\bsequelize\b/i,
  /\btelegram\b/i,
  /\bbtcpay\b/i,
  /\bnowpayments\b/i
];

const browserSafeEntryPatterns = [
  /(^|\/)client-view-model\.(js|d\.ts)$/,
  /(^|\/)client\//,
  /(^|\/)vue\//
];

test('[boundaries] core source does not import product or provider code', () => {
  for (const file of sourceFiles()) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of forbiddenProductPatterns) {
      assert.doesNotMatch(content, pattern, `${rel(file)} should not match forbidden product/provider pattern ${pattern}`);
    }
  }
});

test('[boundaries] quarantined Mushroom ports stay explicitly allowlisted', () => {
  const portFiles = sourceFiles()
    .map(rel)
    .filter((file) => file.startsWith('src/server/ports/mushroom/'));

  assert.deepEqual(portFiles.sort(), Array.from(quarantinedMushroomPortFiles).sort());
});

test('[boundaries] browser-safe core exports avoid Node-only imports', () => {
  for (const file of sourceFiles()) {
    if (!browserSafeEntryPatterns.some((pattern) => pattern.test(file))) continue;
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, /from\s+['"]node:/, `${rel(file)} should not import node:* from browser-safe exports`);
    assert.doesNotMatch(content, /require\s*\(/, `${rel(file)} should not use require() from browser-safe exports`);
  }
});
