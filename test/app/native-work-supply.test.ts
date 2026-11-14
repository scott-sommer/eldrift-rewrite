import { afterEach, expect, test, vi } from 'vitest';
import { generateNativeWorkSupply } from '../../src/app/native-work-supply';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { defaults } from '../../src/config/model';
import { workOwner } from '../../src/features/work/identity';
afterEach(() => vi.unstubAllGlobals());
test('fallback never drains its controller reserve or supplies unowned worker identities', () => {
  for (const name of ['FIND_STRUCTURES', 'FIND_TOMBSTONES', 'FIND_RUINS', 'FIND_DROPPED_RESOURCES', 'RESOURCE_ENERGY',
    'STRUCTURE_CONTAINER', 'STRUCTURE_STORAGE', 'STRUCTURE_TERMINAL', 'STRUCTURE_SPAWN', 'STRUCTURE_EXTENSION', 'STRUCTURE_TOWER']) vi.stubGlobal(name, name);
  const container = (id: string, energy: number, range: number) => ({ id, structureType: 'STRUCTURE_CONTAINER',
    pos: { roomName: 'home', x: 10, y: 10, getRangeTo: () => range },
    store: { getUsedCapacity: () => energy, getFreeCapacity: () => 2000 - energy } });
  const room = { name: 'home', energyAvailable: 300, controller: {}, find: (kind: string) => kind === 'FIND_STRUCTURES' ?
    [container('reserve', 1900, 2), container('source', 30, 10)] : [] } as unknown as Room;
  const worker = (id: string, owner: string, home = 'home') => ({ id, my: true, spawning: false, room,
    memory: { population: { owner, home } }, store: { getFreeCapacity: () => 50 } });
  vi.stubGlobal('Game', { time: 1, creeps: { worker: worker('worker', workOwner('home')), courier: worker('courier', 'logistics:home'),
    other: worker('other', workOwner('home'), 'away') } });
  const memory = {};
  const state = createMemoryPort(() => memory);
  const queue = createLogisticsRequests(state, 'home');
  const config = { ...defaults, workerSupplyEnabled: true };
  generateNativeWorkSupply(state, room, [], config);
  expect(queue.pending(1).map(item => [item.source, item.sink, item.quantity])).toEqual([['source', 'worker', 30]]);
  Game.time = 2;
  generateNativeWorkSupply(state, room, [], { ...config, workerSupplyEnabled: false });
  expect(queue.pending(2)).toEqual([]);
});
