import { afterEach, expect, test, vi } from 'vitest';
import { nativeProductionInventory } from '../../src/app/native-production-inventory';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { defaults } from '../../src/config/model';
import { labServiceOwner } from '../../src/features/industry/lab-services';
afterEach(() => vi.unstubAllGlobals());
function store(stock: Record<string,number>) { return { getUsedCapacity: (resource: string) => stock[resource] ?? 0 } as unknown as StoreDefinition; }
function fixture() {
  vi.stubGlobal('Game',{ time: 1 }); vi.stubGlobal('FIND_MY_STRUCTURES',1); vi.stubGlobal('FIND_MY_CREEPS',2);
  vi.stubGlobal('STRUCTURE_LAB','lab'); vi.stubGlobal('RESOURCES_ALL',['H','O','OH']);
  const bank = { id: 'bank',my: true,isActive: () => true,store: store({ H: 30,O: 20 }) };
  const labs = [{ id: 'lab',structureType: 'lab',isActive: () => true,store: store({ OH: 10 }) },
    { id: 'boost',structureType: 'lab',isActive: () => true,store: store({ OH: 100 }) }];
  const couriers = [{ id: 'ours-id',name: 'ours',store: store({ OH: 5 }) },{ id: 'other-id',name: 'other',store: store({ OH: 90 }) }];
  const room = { name: 'home',storage: bank,find: (kind: number) => kind === 1 ? labs : couriers } as unknown as Room;
  const memory = {}, state = createMemoryPort(() => memory);
  return { state,room };
}
test('production inventory excludes boost labs, unrelated cargo and external claims but includes owned service transit once',() => {
  const f = fixture(), ledger = createQuantityReservations(f.state);
  const pool = logisticsPool('stock','bank','H');
  ledger.reserve({ id: 'foreign',owner: 'elsewhere',holder: 'other',scope: 'other',expiresAt: 3,allocations: [{ pool,amount: 10 }] },{ [pool]: 30 },1);
  const lab = logisticsPool('stock','lab','OH');
  ledger.reserve({ id: 'own',owner: labServiceOwner('home','lab'),holder: 'ours',scope: 'trip',expiresAt: 3,allocations: [{ pool: lab,amount: 5 }] },{ [lab]: 10 },1);
  const inventory = nativeProductionInventory(f.state,f.room,{ ...defaults,labSupplyReserve: 5,labReservedIds: ['boost'] });
  expect(inventory.total).toMatchObject({ H: 30,O: 20,OH: 15 });
  expect(inventory.available).toMatchObject({ H: 15,O: 15,OH: 15 });
  expect(inventory.reserveGap.OH).toBe(5);
});
test('unadmitted courier cargo cannot promise available chain resources',() => {
  const f = fixture();
  expect(nativeProductionInventory(f.state,f.room,{ ...defaults,labReservedIds: ['boost'] }).total.OH).toBe(10);
});
