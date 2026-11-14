import { expect, test } from 'vitest';
import { resolveTraffic } from '../../src/capabilities/movement/traffic/resolve';
import type { TrafficRequest, Occupant } from '../../src/capabilities/movement/traffic/model';
const pos = (x: number, room = 'W0N0') => ({ room, x, y: 20 });
const move = (unit: string, from: number, to: number, priority = 0): TrafficRequest => ({ unit, owner: 'work', from: pos(from), to: pos(to), priority, mobile: true });
const occupancy = (requests: TrafficRequest[]): Occupant[] => requests.map(request => ({ unit: request.unit, position: request.from }));
const accepted = (requests: TrafficRequest[], extra: Occupant[] = []) => resolveTraffic(requests, [...occupancy(requests), ...extra], () => true).accepted.map(request => request.unit);
test('destination contention is deterministic by priority then unit ID', () => {
  const requests = [move('b', 21, 20), move('a', 19, 20)];
  expect(accepted(requests)).toEqual(['a']);
  expect(accepted([...requests].reverse())).toEqual(['a']);
  expect(accepted([{ ...requests[0]!, priority: 2 }, requests[1]!])).toEqual(['b']);
});
test('movement chains and swaps succeed only when all occupants can leave', () => {
  expect(accepted([move('a', 20, 21), move('b', 21, 22)])).toEqual(['a', 'b']);
  expect(accepted([move('a', 20, 21), move('b', 21, 20)])).toEqual(['a', 'b']);
  expect(accepted([move('a', 20, 21), move('b', 21, 22)], [{ unit: 'stationary', position: pos(22) }])).toEqual([]);
  expect(accepted([move('a', 20, 21), { ...move('b', 21, 22), mobile: false }])).toEqual([]);
});
test('formation group rejection propagates to dependent outsiders', () => {
  const requests = [{ ...move('a', 20, 21), group: 'formation' }, { ...move('b', 23, 24), group: 'formation' }, move('c', 19, 20)];
  expect(accepted(requests, [{ unit: 'stationary', position: pos(24) }])).toEqual([]);
});
test('room identity separates destination tiles and invalid origins/duplicates fail', () => {
  const requests = [move('a', 19, 20), { ...move('b', 21, 20), to: pos(20, 'E0N0') }];
  expect(accepted(requests)).toEqual(['a', 'b']);
  expect(() => resolveTraffic(requests, [], () => true)).toThrow('origin');
  expect(() => resolveTraffic([requests[0]!, requests[0]!], occupancy([requests[0]!]), () => true)).toThrow('duplicate');
  expect(resolveTraffic([requests[0]!], occupancy([requests[0]!]), () => false).denied).toEqual([{ unit: 'a', reason: 'invalid-step' }]);
});
