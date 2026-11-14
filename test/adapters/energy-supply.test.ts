import { afterEach, expect, test, vi } from 'vitest';
import { observeEnergySupply } from '../../src/adapters/screeps/energy-supply';
afterEach(() => vi.unstubAllGlobals());
test('energy supply exposes tombstones and ruins as sources only', () => {
  for (const name of ['FIND_STRUCTURES', 'FIND_TOMBSTONES', 'FIND_RUINS', 'RESOURCE_ENERGY']) vi.stubGlobal(name, name);
  const item = (id: string, amount: number) => ({ id, pos: { roomName: 'home', x: 10, y: 10 }, store: { getUsedCapacity: () => amount } });
  const room = { find: (kind: string) => kind === 'FIND_TOMBSTONES' ? [item('tomb', 30)] : kind === 'FIND_RUINS' ? [item('ruin', 20)] : [] } as unknown as Room;
  expect(observeEnergySupply(room)).toMatchObject({ sources: [{ id: 'tomb', amount: 30, priority: -2 }, { id: 'ruin', amount: 20, priority: -1 }], sinks: [] });
});

test('only dropped energy is exposed and its minimum batch reflects courier capacity', () => {
  for (const name of ['FIND_STRUCTURES', 'FIND_TOMBSTONES', 'FIND_RUINS', 'FIND_DROPPED_RESOURCES', 'RESOURCE_ENERGY']) vi.stubGlobal(name, name);
  const drop = { id: 'drop', resourceType: 'RESOURCE_ENERGY', amount: 1000, pos: { roomName: 'home', x: 10, y: 10 } };
  const room = { find: (kind: string) => kind === 'FIND_DROPPED_RESOURCES' ? [drop, { ...drop, id: 'mineral', resourceType: 'H' }] : [] } as unknown as Room;
  expect(observeEnergySupply(room, 50).sources).toMatchObject([{ id: 'drop', amount: 1000, minimumBatch: 50, priority: -3 }]);
  expect(observeEnergySupply(room, 0).sources).toEqual([]);
});
