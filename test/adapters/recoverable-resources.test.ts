import { afterEach, expect, test, vi } from 'vitest';
import { observeRecoverableResources } from '../../src/adapters/screeps/recoverable-resources';
afterEach(() => vi.unstubAllGlobals());
test('preservation observes loose resources and remains, never stored sources or unowned sinks', () => {
  for (const name of ['FIND_DROPPED_RESOURCES', 'FIND_TOMBSTONES', 'FIND_RUINS']) vi.stubGlobal(name, name);
  const store = { H: 30 };
  Object.defineProperty(store, 'getUsedCapacity', { value: () => 30 });
  const room = { find: (kind: string) => kind === 'FIND_DROPPED_RESOURCES' ? [{ id: 'drop', resourceType: 'energy', amount: 100 }]
    : kind === 'FIND_TOMBSTONES' ? [{ id: 'tomb', store }] : [],
    storage: { id: 'storage', my: true, store: { getFreeCapacity: () => 200 } },
    terminal: { id: 'enemy', my: false },
  } as unknown as Room;
  expect(observeRecoverableResources(room, 50)).toEqual({ sources: [
    { id: 'drop', resource: 'energy', amount: 100, minimumBatch: 50, priority: 0 },
    { id: 'tomb', resource: 'H', amount: 30, minimumBatch: 0, priority: 1 },
  ], sinks: [{ id: 'storage', free: 200, priority: 0 }] });
});
