import { expect, test } from 'vitest';
import { selectRetreat } from '../../src/capabilities/movement/retreat';
const tile = (x: number, y: number) => ({ room: 'W0N0', x, y });
test('retreat selects the candidate farthest from threats beyond required clearance', () => {
  const candidates = [tile(15, 16), tile(14, 14), tile(16, 16)];
  expect(selectRetreat(candidates, [tile(20, 20)])).toEqual(tile(14, 14));
  expect(candidates[0]).toEqual(tile(15, 16));
});
test('retreat reports no endpoint when all candidates are threatened or blocked', () => {
  expect(selectRetreat([tile(15, 16)], [tile(16, 16)])).toBeUndefined();
  expect(selectRetreat([], [])).toBeUndefined();
  expect(selectRetreat([tile(15, 16)], [{ room: 'E0N0', x: 15, y: 16 }])).toEqual(tile(15, 16));
});
