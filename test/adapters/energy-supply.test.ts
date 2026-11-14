import { afterEach, expect, test, vi } from 'vitest';
import { observeEnergySupply } from '../../src/adapters/screeps/energy-supply';
afterEach(() => vi.unstubAllGlobals());
test('energy supply exposes tombstones and ruins as sources only', () => {
  for (const name of ['FIND_STRUCTURES', 'FIND_TOMBSTONES', 'FIND_RUINS', 'RESOURCE_ENERGY']) vi.stubGlobal(name, name);
  const item = (id: string, amount: number) => ({ id, pos: { roomName: 'home', x: 10, y: 10 }, store: { getUsedCapacity: () => amount } });
  const room = { find: (kind: string) => kind === 'FIND_TOMBSTONES' ? [item('tomb', 30)] : kind === 'FIND_RUINS' ? [item('ruin', 20)] : [] } as unknown as Room;
  expect(observeEnergySupply(room)).toMatchObject({ sources: [{ id: 'tomb', amount: 30, priority: -2 }, { id: 'ruin', amount: 20, priority: -1 }], sinks: [] });
});
