import { expect, test } from 'vitest';
import { fortificationCeiling, legacyFortificationOrders } from '../../src/features/work/legacy-fortification';
import type { WorkStructure } from '../../src/capabilities/work/assessment';
const position = { room: 'W0N1', x: 10, y: 10 };
const wall = (id: string, hits: number, x: number): WorkStructure =>
  ({ id, hits, maximum: 300000, type: 'constructedWall', position: { ...position, x }, eligible: true, excluded: false });
test('legacy ceiling derives from native RCL capacity with explicit override', () => {
  expect(fortificationCeiling(2, 300000, 0)).toBe(150000);
  expect(fortificationCeiling(8, 300000000, 0)).toBe(299600000);
  expect(fortificationCeiling(8, 300000000, 123)).toBe(123);
});
test('legacy selection falls back to low distance weight and repairs beyond selection ceiling while retained', () => {
  const view = { sites: [], structures: [wall('near', 300, 11), wall('far', 100, 12)] };
  expect(legacyFortificationOrders(view, position, 1000)[0]).toMatchObject({ id: 'far', targetHits: 300000 });
  expect(legacyFortificationOrders(view, position, 200)[0]?.id).toBe('far');
  expect(legacyFortificationOrders(view, position, 100, 'near')[0]?.id).toBe('near');
  expect(legacyFortificationOrders(view, position, 100)).toEqual([]);
  expect(legacyFortificationOrders({ ...view, structures: [{ ...view.structures[0]!, excluded: true }] }, position, 1000, 'near')).toEqual([]);
});
