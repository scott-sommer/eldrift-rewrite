import { afterEach, expect, test, vi } from 'vitest';
import { nativeBoostBudget } from '../../src/app/native-boost-budget';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { defaults } from '../../src/config/model';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import { boostRequest } from '../fixtures/boosts';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
const store = (stock: Record<string,number>) => ({ ...stock,getUsedCapacity: (resource: string) => stock[resource] ?? 0 });
function fixture(labAmount = 120) {
  const memory = {}, state = createMemoryPort(() => memory);
  for (const [key,value] of Object.entries({ FIND_MY_STRUCTURES: 1,FIND_MY_CREEPS: 2,STRUCTURE_LAB: 'lab',RESOURCE_ENERGY: 'energy',RESOURCES_ALL: ['energy','GH2O'],LAB_BOOST_MINERAL: 30,LAB_BOOST_ENERGY: 20 })) vi.stubGlobal(key,value);
  const lab = { id: 'lab',structureType: 'lab',isActive: () => true,mineralType: 'GH2O',mineralAmount: labAmount,store: store({ GH2O: labAmount,energy: 80 }) };
  const bank = { id: 'bank',my: true,isActive: () => true,store: store({ GH2O: 40,energy: 70050 }) };
  const room = { name: 'W0N1',storage: bank,find: (kind: number) => kind === 1 ? [lab] : [] } as unknown as Room;
  vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: room },creeps: {} });
  return { state,room,lab,bank,config: { ...defaults,labSupplyReserve: 10 } };
}
afterEach(() => vi.unstubAllGlobals());
test('native projection separates transferable bank stock from the one matching lab and preserves warehouse floors',() => {
  const f = fixture(); expect(nativeBoostBudget(f.state,f.room,f.config)).toEqual({ minerals: { energy: 50,GH2O: 30 },energy: 50,local: { GH2O: { mineral: 120,energy: 80 } } });
});
test('active boost promises remove remaining kits without deducting their own physical reservations twice',() => {
  const f = fixture(), request = { ...boostRequest(),steps: [{ part: 'work',resource: 'GH2O',count: 2 }] };
  createBoostRequests(f.state).submit(request,1);
  const pool = logisticsPool('stock','lab','GH2O'), owner = 'boost:'+JSON.stringify([request.owner,request.id]);
  createQuantityReservations(f.state).reserve({ id: 'held',owner,holder: request.name,scope: owner,expiresAt: 20,allocations: [{ pool,amount: 60 }] },{ [pool]: 120 },1);
  expect(nativeBoostBudget(f.state,f.room,f.config).local.GH2O).toEqual({ mineral: 60,energy: 40 });
});
test('foreign stock claims are removed before choosing new kits',() => {
  const f = fixture(), pool = logisticsPool('stock','lab','GH2O');
  createQuantityReservations(f.state).reserve({ id: 'foreign',owner: 'logistics',holder: 'courier',scope: 'task',expiresAt: 20,allocations: [{ pool,amount: 60 }] },{ [pool]: 120 },1);
  expect(nativeBoostBudget(f.state,f.room,f.config).local.GH2O).toBeUndefined();
});
test('pending spawn contracts consume future kits and observed birth does not double count queue plus live intake',() => {
  const f = fixture(); createSpawnQueue(f.state,'W0N1').submit({ id: 'future',name: 'future',owner: 'work',room: 'W0N1',priority: 1,readyAt: 1,expiresAt: 20,body: ['work','work','move'],
    boost: { steps: [{ part: 'work',resource: 'GH2O',count: 2 }],required: true,timeout: 80 } });
  expect(nativeBoostBudget(f.state,f.room,f.config).local.GH2O!.mineral).toBe(60);
  Game.creeps.future = { id: 'native',name: 'future',memory: { industryBoostBirth: { id: 'birth',owner: 'work',home: 'W0N1',steps: [{ part: 'work',resource: 'GH2O',count: 2 }],required: true,expiresAt: 90 } } } as unknown as Creep;
  expect(nativeBoostBudget(f.state,f.room,f.config).local.GH2O!.mineral).toBe(60);
});
