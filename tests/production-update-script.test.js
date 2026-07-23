import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const scriptPath = resolve(repoRoot, 'bash/update-production-server.sh');

test('production update shell runner is syntax-valid and product-neutral', () => {
  execFileSync('bash', ['-n', scriptPath]);
  const source = readFileSync(scriptPath, 'utf8');
  assert.doesNotMatch(source, /Mushroom|Meat Master|docker-compose\.production/);
  assert.match(source, /--project-root/);
  assert.match(source, /--compose-file/);
  assert.match(source, /--service/);
  assert.match(source, /failed after aggressive cleanup; not repeating the same build/);
});

test('production update shell runner documents the bootstrap boundary', () => {
  const help = execFileSync('bash', [scriptPath, '--help'], { encoding: 'utf8' });
  assert.match(help, /consumer wrapper must update its own Git checkout/i);
  assert.match(help, /Docker volumes are never/);
});
