import { expect, test } from 'vitest';
import { planMiningCapacity } from '../../src/capabilities/mining/capacity';
import type { MiningStation } from '../../src/capabilities/mining/station';
const station: MiningStation = {
  id: 'source', target: 'source', kind: 'energy', resource: 'energy',
  position: { room: 'W0N0', x: 20, y: 20 },
  access: [19, 20, 21].map(x => ({ room: 'W0N0', x, y: 21 })),
  throughput: 10, available: 0, observedAt: 1, readyAt: 300, risk: 'safe',
};
test('mixed live and queued capacities saturate source without spawning by role count', () => {
  expect(planMiningCapacity(station, [{ id: 'small', rate: 2 }], [{ id: 'large', rate: 8 }], 6))
    .toEqual({ missing: 0, cancel: [], committedRate: 10, shortfall: 0 });
  expect(planMiningCapacity(station, [{ id: 'small', rate: 2 }], [], 6).missing).toBe(2);
  expect(planMiningCapacity(station, [{ id: 'large', rate: 12 }], [{ id: 'excess', rate: 2 }], 6).cancel).toEqual(['excess']);
});
test('tile capacity bounds production and exposes uncovered throughput', () => {
  const result = planMiningCapacity({ ...station, access: station.access.slice(0, 1) }, [], [], 2);
  expect(result).toEqual({ missing: 1, cancel: [], committedRate: 0, shortfall: 8 });
  expect(planMiningCapacity(station, [{ id: 'damaged', rate: 0 }], [], 2).missing).toBe(2);
});
test('queued order preserves priority and discards excess demand', () => {
  expect(planMiningCapacity(station, [], [{ id: 'priority', rate: 12 }, { id: 'later', rate: 2 }], 6))
    .toEqual({ missing: 0, cancel: ['later'], committedRate: 12, shortfall: 0 });
});
test('energy regeneration retains demand; unsafe and depleted mineral stations cancel queued work', () => {
  expect(planMiningCapacity(station, [], [], 10).missing).toBe(1);
  for (const disabled of [{ ...station, risk: 'unknown' as const }, { ...station, kind: 'mineral' as const, extractor: 'extractor' }]) {
    expect(planMiningCapacity(disabled, [], [{ id: 'queued', rate: 2 }], 2))
      .toEqual({ missing: 0, cancel: ['queued'], committedRate: 0, shortfall: 0 });
  }
});
test('capacity rejects duplicate identities and invalid rates', () => {
  expect(() => planMiningCapacity(station, [{ id: 'same', rate: 2 }], [{ id: 'same', rate: 2 }], 2)).toThrow('Duplicate');
  expect(() => planMiningCapacity(station, [], [], 0)).toThrow('replacement');
});
