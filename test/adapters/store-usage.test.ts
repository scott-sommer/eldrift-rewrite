import { afterEach,expect,test,vi } from 'vitest';
import { nativeUsedCapacity } from '../../src/adapters/screeps/store-usage';
import { observePaidHomeInventory } from '../../src/app/remotes/startup/home-observation/inventory';
afterEach(() => vi.unstubAllGlobals());
test('limited-store null is not zero stock and general mixed resources retain total occupied capacity',() => {
  vi.stubGlobal('RESOURCE_ENERGY','energy');
  const store = { energy: 50,getUsedCapacity: (resource?: string) => resource === 'energy' ? 50 : null,getCapacity: () => 300,getFreeCapacity: () => 250 };
  const structure = { id: 'spawn',pos: { roomName: 'W0N1' },store,isActive: () => true } as unknown as StructureSpawn;
  expect(nativeUsedCapacity(store)).toBe(50); expect(observePaidHomeInventory(structure)).toMatchObject({ energy: 50,usedCapacity: 50,capacity: 300 });
  expect(nativeUsedCapacity({ ...store,energy: 50,H: 20,getUsedCapacity: () => 70 })).toBe(70);
});
