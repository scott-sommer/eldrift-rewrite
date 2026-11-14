import { expect, test } from 'vitest';
import { createPathService } from '../../src/capabilities/movement/path-service';
import { pathKey } from '../../src/capabilities/movement/path-key';
import type { PathRequest, PathResult } from '../../src/capabilities/movement/path-model';
const request: PathRequest = {
  origin: { room: 'W0N0', x: 48, y: 20 }, destination: { room: 'E0N0', x: 1, y: 20 }, range: 1,
  profile: { id: 'hauler', plainCost: 2, swampCost: 10, maxOps: 2000, maxRooms: 4 },
  topologyVersion: 'roads-1', policyVersion: 'safe-1', allowedRooms: ['W0N0', 'E0N0'],
};
const complete: PathResult = { status: 'complete', path: [{ room: 'E0N0', x: 0, y: 20 }], cost: 4, operations: 10 };
test('cache isolates returned paths, expires, invalidates and reconstructs after reset', () => {
  let tick = 1;
  let calls = 0;
  const search = () => { calls++; return complete; };
  let paths = createPathService(search, () => tick, 2, 3);
  const first = paths.find(request);
  if (first.status !== 'no-route') first.path[0]!.x = 49;
  expect(paths.find(request)).toEqual(complete);
  expect(calls).toBe(1);
  tick = 4;
  paths.find(request);
  expect(calls).toBe(2);
  paths.invalidate(request);
  paths.find(request);
  expect(calls).toBe(3);
  paths = createPathService(search, () => tick);
  paths.find(request);
  expect(calls).toBe(4);
});
test('keys include endpoints, range, profile values, topology, policy and allowed rooms', () => {
  const variants = [
    { ...request, origin: { ...request.origin, room: 'E0N0' } },
    { ...request, destination: { ...request.destination, y: 21 } }, { ...request, range: 0 },
    { ...request, profile: { ...request.profile, swampCost: 5 } },
    { ...request, profile: { ...request.profile, maxOps: 4000 } },
    { ...request, topologyVersion: 'roads-2' }, { ...request, policyVersion: 'safe-2' },
    { ...request, allowedRooms: ['W0N0'] },
  ];
  expect(new Set([request, ...variants].map(pathKey)).size).toBe(variants.length + 1);
  expect(pathKey({ ...request, allowedRooms: ['E0N0', 'W0N0', 'W0N0'] })).toBe(pathKey(request));
});
test('incomplete and policy failures are not cached; capacity evicts older entries', () => {
  let calls = 0;
  let result: PathResult = { status: 'incomplete', path: [], cost: 0, operations: 2000 };
  const paths = createPathService(() => { calls++; return result; }, () => 1, 1);
  paths.find(request); paths.find(request);
  expect(calls).toBe(2);
  result = { status: 'no-route', reason: 'room-policy' };
  paths.find(request); paths.find(request);
  expect(calls).toBe(4);
  result = complete;
  paths.find(request);
  paths.find({ ...request, topologyVersion: 'changed' });
  paths.find(request);
  expect(calls).toBe(7);
});
