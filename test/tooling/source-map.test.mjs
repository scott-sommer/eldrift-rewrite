import { expect, test } from 'vitest';
import { build } from 'esbuild';
import vm from 'node:vm';
import { tracePosition } from '../../tools/source-position.mjs';

test('maps a real bundled exception back to its TypeScript source', async () => {
  const result = await build({
    stdin: { contents: 'export function fail(): never {\n  throw new Error("fixture failure");\n}', sourcefile: 'fixture.ts', loader: 'ts' },
    outfile: 'fixture.js', bundle: true, format: 'cjs', platform: 'neutral', sourcemap: 'external', write: false,
  });
  const bundle = result.outputFiles.find(file => file.path.endsWith('.js')).text;
  const map = JSON.parse(result.outputFiles.find(file => file.path.endsWith('.map')).text);
  const module = { exports: {} };
  vm.runInNewContext(bundle, { module, exports: module.exports }, { filename: 'fixture.js' });
  let failure;
  try { module.exports.fail(); } catch (error) { failure = error; }
  expect(failure.message).toBe('fixture failure');
  const match = failure.stack.match(/fixture\.js:(\d+):(\d+)/);
  expect(match).not.toBeNull();
  const original = tracePosition(map, Number(match[1]), Number(match[2]));
  expect(original.source).toBe('fixture.ts');
  expect(original.line).toBe(2);
  expect(original.column).toBeGreaterThan(0);
});

test('rejects invalid stack coordinates', () => {
  expect(() => tracePosition({}, 0, 1)).toThrow('positive integers');
});
