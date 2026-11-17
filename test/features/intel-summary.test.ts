import { expect, test } from 'vitest';
import { classifyIntelRoom } from '../../src/features/intel/classification';
import { validRoomSummary } from '../../src/features/intel/summary-validation';
import { createIntelStore } from '../../src/features/intel/store';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import type { RoomSummary } from '../../src/features/intel/model';
import { intelSummary } from '../fixtures/intel-summary';
test.each([
  ['W0N0', true, false, false], ['E10S2', true, false, false], ['W4N4', false, true, false],
  ['E6S6', false, true, false], ['W5N5', false, true, true], ['W3N7', false, false, false],
] as const)('world classification preserves the legacy sector convention in %s', (room, highway, keeper, center) => {
  expect(classifyIntelRoom(room)).toEqual({ highway, keeper, center });
});
test('malformed facts, duplicate IDs, false classification and impossible exits never replace the last observation', () => {
  const memory = {}, port = createMemoryPort(() => memory), store = createIntelStore(port);
  store.observeSummary(intelSummary());
  const before = JSON.stringify(memory);
  const mutations: ((summary: RoomSummary) => void)[] = [
    summary => { summary.sources[0]!.x = 50; },
    summary => { summary.sources[0]!.capacity = -1; },
    summary => { summary.units[0]!.id = summary.structures[0]!.id; },
    summary => { summary.exits.push({ ...summary.exits[0]! }); },
    summary => { summary.exits[0]!.room = 'W0N0'; },
    summary => { summary.keeper = true; },
    summary => { summary.controller!.level = 9; },
    summary => { summary.controller!.owner = null; },
    summary => { summary.controller!.reservation = { username: 'other', ticksToEnd: 100 }; },
    summary => { summary.structures[0]!.hostile = true; },
    summary => { summary.observedAt = NaN; },
    summary => { summary.units[0]!.owner = ''; },
  ];
  for (const mutate of mutations) {
    const summary = intelSummary(11); mutate(summary);
    expect(validRoomSummary(summary)).toBe(false);
    expect(() => store.observeSummary(summary)).toThrow();
    expect(JSON.stringify(memory)).toBe(before);
  }
});
