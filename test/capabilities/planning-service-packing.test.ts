import { expect, test } from 'vitest';
import { packCompactServices } from '../../src/capabilities/planning/service-packing';
import { serviceCandidates } from '../../src/capabilities/planning/service-candidates';
const storage = { x: 25, y: 25 };
const crossRoads = Array.from({ length: 19 }, (_, index) => ({ x: 16 + index, y: 25 }))
  .concat(Array.from({ length: 19 }, (_, index) => ({ x: 25, y: 16 + index })));
const roads = crossRoads.concat([19, 31].flatMap(x =>
  Array.from({ length: 19 }, (_, index) => ({ x, y: 16 + index }))));
const candidates = serviceCandidates(storage, roads, () => true);
const limits = {
  spawn: [0, 1, 1, 1, 1, 1, 1, 2, 3], tower: [0, 0, 0, 1, 1, 2, 2, 3, 6],
  extension: [0, 0, 5, 10, 20, 30, 40, 50, 60], observer: [0, 0, 0, 0, 0, 0, 0, 0, 1],
  powerSpawn: [0, 0, 0, 0, 0, 0, 0, 0, 1], nuker: [0, 0, 0, 0, 0, 0, 0, 0, 1],
};
const input = { storage, controller: { x: 40, y: 40 }, candidates, reserved: [], limits, canPlace: () => true };
test('service packing reserves distinct positions in recipe order and stages the full population', () => {
  const result = packCompactServices(input);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.entries).toHaveLength(72);
  expect(result.omitted).toEqual([]);
  expect(new Set(result.entries.map(entry => JSON.stringify(entry.position))).size).toBe(72);
  expect(result.entries.slice(0, 3).map(entry => entry.type)).toEqual(['spawn', 'spawn', 'spawn']);
  expect(result.entries.filter(entry => entry.type === 'extension' && entry.rcl <= 2)).toHaveLength(5);
  expect(packCompactServices({ ...input, candidates: [...candidates].reverse() })).toEqual(result);
});
test('required placement failure returns a reason without a partial draft or changed reservations', () => {
  const reserved = [{ x: 24, y: 24 }];
  const result = packCompactServices({ ...input, reserved, canPlace: type => type !== 'tower' });
  expect(result).toEqual({ ok: false, type: 'tower', required: 6, available: 0 });
  expect(reserved).toEqual([{ x: 24, y: 24 }]);
});
test('legacy optional utility omissions are explicit and do not remove the service population', () => {
  const result = packCompactServices({ ...input, canPlace: type => type !== 'nuker' });
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.omitted).toEqual(['nuker']);
    expect(result.entries).toHaveLength(71);
  }
});

test('road-space scarcity preserves required structures and reports the missing power spawn', () => {
  const result = packCompactServices({ ...input, candidates: serviceCandidates(storage, crossRoads, () => true) });
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.omitted).toEqual(['powerSpawn']);
    expect(result.entries.filter(entry => entry.tag === 'service')).toHaveLength(69);
  }
});
