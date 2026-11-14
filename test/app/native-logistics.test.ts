import { afterEach, expect, test, vi } from 'vitest';
import { createNativeLogisticsFeature, haulingOwner } from '../../src/app/native-logistics';
import type { createNativeDispatch } from '../../src/app/native-dispatch';
import type { FeatureContext } from '../../src/app/runtime-model';
import { resolveConfig } from '../../src/config/resolve';
import type { Envelope } from '../../src/persistence/versioned-state';
afterEach(() => vi.unstubAllGlobals());
test('native logistics respects activation, room ownership, population ownership and spawning state', () => {
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, value); } };
  const activate = vi.fn();
  const dispatch = { activate } as unknown as ReturnType<typeof createNativeDispatch>;
  const logistics = createNativeLogisticsFeature(state, dispatch);
  const creep = (name: string, home: string, owner: string, spawning = false) => ({ name, id: name, spawning,
    memory: { population: { home, owner } }, store: { getUsedCapacity: () => 0 } });
  const room = { name: 'home', controller: { my: true } };
  vi.stubGlobal('Game', { time: 1, rooms: { home: room }, creeps: {
    courier: creep('courier', 'home', haulingOwner('home')),
    miner: creep('miner', 'home', 'mining:station'),
    visitor: creep('visitor', 'elsewhere', haulingOwner('elsewhere')),
    spawning: creep('spawning', 'home', haulingOwner('home'), true),
  } });
  const context = (enabled: boolean) => ({ room: { name: 'home' }, config: resolveConfig({ empire: { logisticsEnabled: enabled } }, 1) }) as FeatureContext;
  logistics.feature.run(context(false));
  expect(activate).not.toHaveBeenCalled();
  expect(records.size).toBe(0);
  room.controller.my = false;
  logistics.feature.run(context(true));
  expect(activate).not.toHaveBeenCalled();
  room.controller.my = true;
  logistics.feature.run(context(true));
  expect(activate).toHaveBeenCalledOnce();
  expect([...records.keys()].filter(key => key.startsWith('tasks/'))).toEqual(['tasks/courier']);
});


test('donor-only work does not inflate local courier population demand', async () => {
  const { maintainNativeCouriers } = await import('../../src/app/native-courier-population');
  const { createLogisticsRequests } = await import('../../src/features/logistics/request-store');
  const { createSpawnQueue } = await import('../../src/features/population/spawn-queue');
  const { supportOwner } = await import('../../src/features/recovery/support-identity');
  const records = new Map<string, Envelope>();
  const state = { read: (key: string) => records.get(key), write: (key: string, value: Envelope) => { records.set(key, structuredClone(value)); } };
  vi.stubGlobal('Game', { time: 1, creeps: {} });
  const room = { name: 'W0N1', energyAvailable: 300, energyCapacityAvailable: 300 } as Room;
  const config = resolveConfig({ empire: { courierSpawningEnabled: true } }, 1).values;
  const queue = createLogisticsRequests(state, 'W0N1');
  const request = { id: 'support', owner: supportOwner('W0N1', 'E0N1'), source: 'source', sink: 'sink', resource: 'energy', quantity: 100, priority: 2, expiresAt: 100 };
  queue.submit(request, 1);
  const routes = () => ({ routes: [], travelTicks: 0, unavailable: [] });
  maintainNativeCouriers(state, room, config, routes);
  expect(createSpawnQueue(state, 'W0N1').list()).toEqual([]);
  queue.submit({ ...request, id: 'local', owner: 'local' }, 1);
  maintainNativeCouriers(state, room, config, routes);
  expect(createSpawnQueue(state, 'W0N1').list()).toHaveLength(1);
});
