import { expect, test } from 'vitest';
import { measureSerialization } from '../../src/persistence/diagnostics';

test('reports code units separately from UTF-8 and measures validation plus serialization', () => {
  let time = 10;
  const result = measureSerialization({ text: 'é😀' }, () => { const value = time; time += 0.25; return value; });
  expect(result).toEqual({ codeUnits: 14, utf8Bytes: 17, elapsed: 0.25 });
});

test('measurement does not change source state and rejects invalid data', () => {
  const state = { records: { a: { version: 1, data: [1, 2] } } };
  const before = JSON.stringify(state);
  expect(measureSerialization(state, () => 0).codeUnits).toBe(before.length);
  expect(JSON.stringify(state)).toBe(before);
  expect(() => measureSerialization({ invalid: NaN }, () => 0)).toThrow();
});
