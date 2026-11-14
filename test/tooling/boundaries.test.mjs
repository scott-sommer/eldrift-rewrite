import { expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const checker = path.resolve('tools/check-boundaries.mjs');
const artifacts = path.resolve('artifacts');
fs.mkdirSync(artifacts, { recursive: true });

function inspect(files) {
  const root = fs.mkdtempSync(path.join(artifacts, 'boundaries-'));
  for (const [name, source] of Object.entries(files)) {
    const target = path.join(root, 'src', name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }
  const result = spawnSync(process.execPath, [checker], {
    cwd: root, encoding: 'utf8', timeout: 10000,
  });
  if (result.error) throw result.error;
  return result;
}

test('allows core helpers and feature-to-capability imports', () => {
  const result = inspect({
    'core/math.ts': 'export const double = (n: number) => n * 2;',
    'capabilities/work.ts': 'export const work = () => 1;',
    'features/economy.ts': "import { work } from '../capabilities/work'; export const run = work;",
  });
  expect(result.status).toBe(0);
});

test('rejects a pure-core dependency on feature policy', () => {
  const result = inspect({ 'core/bad.ts': "export { policy } from '../features/policy';" });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('cannot import');
});

test('rejects live game state in the pure core', () => {
  const result = inspect({ 'core/bad.ts': 'export const now = () => Game.time;' });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('game global Game');
});

test('rejects computed module loading that would bypass static boundaries', () => {
  const result = inspect({ 'app/bad.ts': 'export const load = (name: string) => import(name);' });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('computed module loading');
});
