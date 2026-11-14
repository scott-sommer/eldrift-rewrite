import { afterEach, expect, test, vi } from 'vitest';
import { generateNativeStoreBalance } from '../../src/app/native-store-balance';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { defaults } from '../../src/config/model';
afterEach(() => vi.unstubAllGlobals());
function room(available: number): Room {
  const item = (id: string, energy: number) => ({ id, my: true, store: { energy, getUsedCapacity: (resource: string) => resource === 'energy' ? energy : 0, getFreeCapacity: () => 100000 } });
  return { name: 'home', energyAvailable: available, energyCapacityAvailable: 300,
    storage: item('storage', 80000), terminal: item('terminal', 19970) } as unknown as Room;
}
test('strict room-energy guard retires unassigned balancing before courier admission and resumes above threshold', () => {
  vi.stubGlobal('Game', { time: 1 });
  const memory = {};
  const state = createMemoryPort(() => memory);
  const queue = createLogisticsRequests(state, 'home');
  const config = { ...defaults, storeBalancingEnabled: true };
  generateNativeStoreBalance(state, room(225), config);
  expect(queue.pending(1)).toEqual([]);
  generateNativeStoreBalance(state, room(226), config);
  expect(queue.pending(1)).toHaveLength(1);
  vi.stubGlobal('Game', { time: 2 });
  generateNativeStoreBalance(state, room(100), config);
  expect(queue.pending(2)).toEqual([]);
  vi.stubGlobal('Game', { time: 3 });
  generateNativeStoreBalance(state, room(200), { ...config, storeBalanceMinimumEnergyFraction: 0.5 });
  expect(queue.pending(3)).toHaveLength(1);
});
