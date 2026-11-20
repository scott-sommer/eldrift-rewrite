import { expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const python = path.resolve(process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
const checker = path.resolve('tools/quality/lizard_check.py');
// Each case can run two Python checks, each with a 10-second process limit.
const toolingTimeout = 25000;
const artifacts = path.resolve('artifacts');
fs.mkdirSync(artifacts, { recursive: true });
function check(source, testSource) {
  const root = fs.mkdtempSync(path.join(artifacts, 'lizard-'));
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'fixture.ts'), source);
  if (testSource) {
    fs.mkdirSync(path.join(root, 'test'));
    fs.writeFileSync(path.join(root, 'test', 'fixture.ts'), testSource);
  }
  const result = spawnSync(python, [checker], { cwd: root, encoding: 'utf8', timeout: 10000 });
  if (result.error) throw result.error;
  const report = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/lizard.json'), 'utf8'));
  return { ...result, report };
}
function branching(branches) {
  return `export function decide(x: number) {\n${Array.from({ length: branches }, (_, i) => `if (x === ${i}) return ${i};`).join('\n')}\nreturn -1;\n}`;
}
function longFunction(lines) {
  return `export function sum() {\nlet x = 0;\n${'x++;\n'.repeat(lines - 4)}return x;\n}`;
}
test('accepts CCN 10 and rejects CCN 11 in TypeScript', () => {
  expect(check(branching(9)).status).toBe(0);
  const rejected = check(branching(10));
  expect(rejected.status).toBe(1);
  expect(rejected.stderr).toContain('CCN 11 > 10');
}, toolingTimeout);
test('accepts 50 function NLOC and rejects 51', () => {
  const accepted = check(longFunction(50));
  expect(accepted.report.production[0].functions[0].nloc).toBe(50);
  expect(accepted.status).toBe(0);
  expect(check(longFunction(51)).stderr).toContain('NLOC 51 > 50');
}, toolingTimeout);
test('accepts 300 file NLOC and rejects 301 independent of function size', () => {
  const source = count => Array.from({ length: count }, (_, i) => `export const value${i} = ${i};`).join('\n');
  expect(check(source(300)).status).toBe(0);
  const rejected = check(source(301));
  expect(rejected.status).toBe(1);
  expect(rejected.stderr).toContain('file NLOC 301 > 300');
}, toolingTimeout);
test('excludes comments and blanks; reports complex tests without failing production', () => {
  const result = check('// comment\n\nexport const value = 1;\n', branching(15));
  expect(result.status).toBe(0);
  expect(result.report.production[0].nloc).toBe(1);
  expect(result.report.tests[0].functions[0].ccn).toBe(16);
}, toolingTimeout);
