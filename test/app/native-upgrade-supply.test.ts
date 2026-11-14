import { afterEach, expect, test, vi } from 'vitest';
import { createNativeUpgradeSupply } from '../../src/app/native-upgrade-supply';
import type { createNativeDispatch } from '../../src/app/native-dispatch';
import type { FeatureContext } from '../../src/app/runtime-model';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { upgradeSupplyRoutes } from '../../src/app/native-upgrade-supply-routes';
import { upgradeSupplyOwner } from '../../src/features/work/upgrade-supply';
import { defaults } from '../../src/config/model';
import { resolveConfig } from '../../src/config/resolve';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const state = createMemoryPort(() => (memory));
  const memory = {};
  const settings = { ...defaults, upgradeRoomEnabled: true, upgradeSupplyEnabled: true, upgradeSupplySpawningEnabled: true,
    upgradeRoomSponsor: 'W0N1', upgradeSupplyTarget: 2, upgradeFleetStartEnergy: 100, upgradeFleetStopEnergy: 50 };
  const home = { name: 'W0N1', energyCapacityAvailable: 2500, controller: { my: true }, storage: { store: { energy: 1000 } } };
  const target = { name: 'E0N1', controller: { my: true, level: 2 }, storage: { store: { energy: 0 } } };
  vi.stubGlobal('Game', { time: 1, rooms: { W0N1: home, E0N1: target }, creeps: {} });
  const dispatch = { activate: vi.fn() } as unknown as ReturnType<typeof createNativeDispatch>;
  const feature = createNativeUpgradeSupply(state, dispatch, () => settings);
  const run = () => feature.run({ room: { name: home.name } } as FeatureContext);
  return { state, settings, home, target, run, queue: createSpawnQueue(state, home.name) };
}
test('supply recruitment keeps sponsor identity and cancels queued requests after configuration is disabled', () => {
  const f = fixture();
  f.run(); f.run();
  const requests = f.queue.list();
  expect(requests).toHaveLength(2);
  expect(requests.map(request => request.priority).sort((a, b) => a - b)).toEqual([88, 93]);
  expect(requests.every(request => request.home === 'W0N1' && request.room === 'W0N1'
    && request.owner === upgradeSupplyOwner('W0N1', 'E0N1') && request.body.length === 50)).toBe(true);
  const other = { ...requests[0]!, id: 'unrelated', name: 'unrelated', owner: 'mining' };
  f.queue.submit(other);
  f.settings.upgradeSupplyEnabled = false;
  f.run();
  expect(f.queue.list()).toEqual([other]);
});
test('unaffordable body, ownership loss and stopped recruitment never leave stale supply requests', () => {
  const f = fixture();
  f.home.energyCapacityAvailable = 2499;
  f.run();
  expect(f.queue.list()).toEqual([]);
  f.home.energyCapacityAvailable = 2500;
  f.run();
  expect(f.queue.list()).toHaveLength(2);
  f.target.controller.my = false;
  f.run();
  expect(f.queue.list()).toEqual([]);
  f.target.controller.my = true;
  f.run();
  f.settings.upgradeSupplySpawningEnabled = false;
  f.run();
  expect(f.queue.list()).toEqual([]);
});
test('disabled routes remain discoverable through live sponsor-owned couriers even without target vision', () => {
  const f = fixture();
  vi.stubGlobal('Game', { time: 2, rooms: { W0N1: f.home }, creeps: {
    supply: { memory: { population: { home: 'W0N1', owner: upgradeSupplyOwner('W0N1', 'E0N1') } } },
    other: { memory: { population: { home: 'W1N1', owner: upgradeSupplyOwner('W1N1', 'E1N1') } } },
  } });
  f.settings.upgradeSupplyEnabled = false;
  expect(upgradeSupplyRoutes(f.state, 'W0N1', () => f.settings)).toEqual(['E0N1']);
});
test('supply configuration defaults off and validates fixed roster and stock reserve bounds', () => {
  expect(resolveConfig({}, 1).values.upgradeSupplyEnabled).toBe(false);
  expect(resolveConfig({ roomOverride: { upgradeSupplyTarget: 8, upgradeSupplyReserve: 1300000 } }, 1).values.upgradeSupplyTarget).toBe(8);
  for (const patch of [{ upgradeSupplyTarget: 9 }, { upgradeSupplyTarget: 0.5 }, { upgradeSupplyReserve: -1 }]) {
    expect(() => resolveConfig({ roomOverride: patch }, 1)).toThrow();
  }
});
