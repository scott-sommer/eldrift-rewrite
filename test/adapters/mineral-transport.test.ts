import { afterEach, expect, test, vi } from 'vitest';
import { observeMineralTransport } from '../../src/adapters/screeps/mineral-transport';
import { generateStockRequests } from '../../src/features/logistics/stock-requests';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
afterEach(() => vi.unstubAllGlobals());
function roomFixture(terminalFree = 50030) {
  for (const name of ['FIND_MINERALS', 'FIND_STRUCTURES', 'STRUCTURE_CONTAINER']) vi.stubGlobal(name, name);
  const stock = { H: 30, energy: 20 };
  const store = Object.assign({}, stock);
  Object.defineProperty(store, 'getUsedCapacity', { value: (resource: keyof typeof stock) => stock[resource] });
  const container = (id: string, range: number) => ({ id, structureType: 'STRUCTURE_CONTAINER', pos: { getRangeTo: () => range }, store });
  const destination = (id: string, free: number, my = true) => ({ id, my, store: { getFreeCapacity: () => free } });
  return { find: (kind: string) => kind === 'FIND_MINERALS' ? [{}] : [container('mineral', 2), container('ordinary', 3)],
    terminal: destination('terminal', terminalFree), storage: destination('storage', 50040) } as unknown as Room;
}
const policy = { owner: 'mineral', namespace: 'mineral-transport', priority: 5, lifetime: 100, maximumQuantity: 200, maximumNewRequests: 10 };
test('only mineral-adjacent containers supply transport; terminal and storage headroom stay reserved', () => {
  const observed = observeMineralTransport(roomFixture(), 50000, 50000);
  expect(observed.sources.map(item => [item.id, item.resource, item.amount])).toEqual([['mineral', 'H', 30], ['mineral', 'energy', 20]]);
  expect(observed.sinks).toEqual([{ id: 'terminal', free: 30, priority: 0 }, { id: 'storage', free: 40, priority: 1 }]);
  const memory = {};
  const state = createMemoryPort(() => memory);
  generateStockRequests(state, 'home', 1, observed.sources, observed.sinks, policy);
  expect(createLogisticsRequests(state, 'home').pending(1).map(item => [item.resource, item.sink, item.quantity]).sort())
    .toEqual([['H', 'terminal', 10], ['energy', 'terminal', 20]]);
});
test('terminal headroom exhaustion redirects unassigned stock without duplicating work', () => {
  const memory = {};
  const state = createMemoryPort(() => memory);
  const first = observeMineralTransport(roomFixture(50100), 50000, 50000);
  generateStockRequests(state, 'home', 1, first.sources, first.sinks, policy);
  const changed = observeMineralTransport(roomFixture(50000), 50000, 50000);
  generateStockRequests(state, 'home', 2, changed.sources, changed.sinks, policy);
  const pending = createLogisticsRequests(state, 'home').pending(2);
  expect(pending.map(item => [item.resource, item.sink, item.quantity]).sort()).toEqual([['H', 'storage', 20], ['energy', 'storage', 20]]);
  expect(generateStockRequests(state, 'home', 3, changed.sources, changed.sinks, policy)).toBe(0);
});
test('unowned or absent destinations never receive mineral requests', () => {
  const room = roomFixture();
  const observed = observeMineralTransport({ ...room, terminal: { ...room.terminal, my: false }, storage: undefined } as unknown as Room, 50000, 50000);
  expect(observed.sinks).toEqual([]);
});
