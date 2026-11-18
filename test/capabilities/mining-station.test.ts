import { expect, test } from 'vitest';
import { validateStation } from '../../src/capabilities/mining/station';
import type { MiningStation } from '../../src/capabilities/mining/station';
import { createStationAssignments } from '../../src/features/mining/assignments';
import type { Envelope } from '../../src/persistence/versioned-state';
const station: MiningStation = { id: 'source', target: 'source', kind: 'energy', resource: 'energy',
  position: { room: 'W0N0', x: 20, y: 20 }, access: [{ room: 'W0N0', x: 21, y: 20 }],
  throughput: 10, available: 3000, observedAt: 1, readyAt: 1, risk: 'safe' };
test('station access is adjacent, room-aware and unique', () => {
  expect(() => validateStation(station)).not.toThrow();
  expect(() => validateStation({ ...station, access: [station.position] })).toThrow('border');
  expect(() => validateStation({ ...station, access: [{ room: 'E0N0', x: 21, y: 20 }] })).toThrow('border');
  expect(() => validateStation({ ...station, access: [station.access[0]!, station.access[0]!] })).toThrow('access');
});
test('durable tile leases prevent overbooking across sources and expire or release on replacement', () => {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  const tile = station.access[0]!;
  let assignments = createStationAssignments(state);
  expect(assignments.acquire(station, tile, 'a', 'task-a', 1, 5)).toBe(true);
  assignments = createStationAssignments(state);
  expect(assignments.acquire(station, tile, 'b', 'task-b', 2, 5)).toBe(false);
  const neighbor = { ...station, id: 'other', target: 'other', position: { ...station.position, x: 22 } };
  expect(assignments.acquire(neighbor, tile, 'b', 'task-b', 2, 5)).toBe(false);
  expect(assignments.acquire(station, tile, 'b', 'task-b', 6, 5)).toBe(true);
  assignments.release('task-b');
  expect(assignments.acquire(station, tile, 'c', 'task-c', 6, 5)).toBe(true);
  expect(assignments.acquire({ ...station, risk: 'hostile' }, tile, 'c', 'task-c', 7, 5)).toBe(false);
});

test('tile selection keeps an existing lease across reset instead of chasing newly freed preferred tiles', () => {
  const records = new Map<string,Envelope>();
  const state = { read: (key: string) => records.get(key),write: (key: string,value: Envelope) => { records.set(key,structuredClone(value)); } };
  const first = station.access[0]!, second = { ...first,y: first.y + 1 }, expanded = { ...station,access: [first,second] };
  let assignments = createStationAssignments(state);
  expect(assignments.select(expanded,'a','scope-a',1,3)).toEqual(first);
  expect(assignments.select(expanded,'b','scope-b',1,3)).toEqual(second);
  assignments.release('scope-a'); assignments = createStationAssignments(state);
  expect(assignments.select(expanded,'b','scope-b',2,3)).toEqual(second);
  expect(assignments.select(expanded,'c','scope-c',2,3)).toEqual(first);
  expect(assignments.select({ ...expanded,risk: 'unknown' },'b','scope-b',3,3)).toBeUndefined();
});
