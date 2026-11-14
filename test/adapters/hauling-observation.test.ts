import { afterEach, expect, test, vi } from 'vitest';
import { observeHauling } from '../../src/adapters/screeps/hauling-observation';
import { createNativeTransfer } from '../../src/adapters/screeps/transfer';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
const request = { id: 'fill', owner: 'room', source: 'source', sink: 'sink', resource: 'energy', quantity: 100, priority: 0, expiresAt: 100 };
const creep = { store: { getUsedCapacity: () => 10, getFreeCapacity: () => 40 }, pos: { inRangeTo: () => false } } as unknown as Creep;
function store(total: number | null, free = 80) {
  return { getCapacity: () => total, getFreeCapacity: () => free, getUsedCapacity: () => 30 };
}
function world(source: unknown, sink: unknown) {
  vi.stubGlobal('Game', { time: 5, rooms: {}, getObjectById: (id: string) => id === 'source' ? source : sink });
}
afterEach(() => vi.unstubAllGlobals());
test('shared capacity pools compete across resources; specialized compartments remain separate', () => {
  world({ store: store(2000) }, { structureType: 'storage', store: store(1000000) });
  const energy = observeHauling(creep, request);
  expect(energy).toMatchObject({ cargo: 10, freeCargo: 40, sourceStock: 30, sinkFree: 80 });
  expect(observeHauling(creep, { ...request, resource: 'H' }).sinkPool).toBe(energy.sinkPool);
  world(null, { structureType: 'lab', store: store(null) });
  const hydrogen = observeHauling(creep, { ...request, resource: 'H' });
  expect(hydrogen.sinkPool).toBe(observeHauling(creep, { ...request, resource: 'O' }).sinkPool);
  expect(hydrogen.sinkPool).not.toBe(observeHauling(creep, request).sinkPool);
});
test('missing targets and invalid directions have no capacity; drops require matching resources', () => {
  world({ resourceType: 'H', amount: 70 }, { store: store(2000) });
  expect(observeHauling(creep, request)).toMatchObject({ sourceStock: 0, sinkFree: 0 });
  expect(observeHauling(creep, { ...request, resource: 'H' }).sourceStock).toBe(70);
  world({ body: [], store: store(50) }, null);
  expect(observeHauling(creep, request)).toMatchObject({ sourceStock: 0, sinkFree: 0 });
  world(null, { structureType: 'spawn', store: { ...store(null), getFreeCapacity: () => null } });
  expect(observeHauling(creep, request)).toMatchObject({ sourceStock: 0, sinkFree: 0 });
});
test('transfer approach follows current visible target position rather than an old request position', () => {
  world(null, { id: 'sink', body: [], store: store(50), pos: { roomName: 'W1N1', x: 30, y: 31 } });
  const move = vi.fn<(creep: Creep, command: { destination: unknown }) => { status: 'running' }>(() => ({ status: 'running' }));
  const begin = vi.fn();
  const transfer = createNativeTransfer(createActionArbiter(() => 5), { move }, begin);
  transfer(creep, { owner: 'haul', attemptId: 'attempt', target: 'sink', position: { room: 'W0N0', x: 10, y: 10 },
    resource: 'energy', kind: 'transfer', maximum: 10, policy: { version: 'test', blockedRooms: [], costs: {}, maximumRooms: 4 } });
  expect(move.mock.calls[0]?.[1]).toMatchObject({ destination: { room: 'W1N1', x: 30, y: 31 } });
  expect(begin).not.toHaveBeenCalled();
});


test('missing destination requires its known room to be visible', () => {
  world(null, null);
  expect(observeHauling(creep, request, 'W0N1').sinkStatus).toBe('unseen');
  vi.stubGlobal('Game', { time: 5, rooms: { W0N1: {} }, getObjectById: () => null });
  expect(observeHauling(creep, request, 'W0N1').sinkStatus).toBe('missing');
  expect(observeHauling(creep, request).sinkStatus).toBe('unseen');
});

test('mobile destinations do not persist a room as proof of destruction', () => {
  world(null, { body: [], store: store(50), pos: { roomName: 'W0N1' } });
  expect(observeHauling(creep, request).sinkRoom).toBeUndefined();
  expect(observeHauling(creep, request).sinkStatus).toBe('visible');
});

test('pickup observations expose the unthrottled native amount, unlike withdrawals', () => {
  world({ resourceType: 'energy', amount: 70 }, null);
  expect(observeHauling(creep, request).minimumCollection).toBe(40);
  world({ resourceType: 'energy', amount: 20 }, null);
  expect(observeHauling(creep, request).minimumCollection).toBe(20);
  world({ store: store(2000) }, null);
  expect(observeHauling(creep, request).minimumCollection).toBe(0);
});
