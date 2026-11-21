import { afterEach, expect, test, vi } from 'vitest';
import { NativeBoostCycle } from '../../src/app/native-boost-cycle';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createBoostRequests } from '../../src/features/industry/boosts/store';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { reserveBoostStock } from '../../src/features/industry/boosts/resources';
import { reconcileServiceRequest } from '../../src/features/logistics/service-request';
import { createLogisticsRequests } from '../../src/features/logistics/request-store';
import { boostScope, boostServiceOwner } from '../../src/capabilities/industry/boosts/model';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { boostRequest } from '../fixtures/boosts';
import { defaults } from '../../src/config/model';
import type { createNativeDispatch } from '../../src/app/native-dispatch';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  let memory = {}; const state = createMemoryPort(() => memory), store = createBoostRequests(state), request = { ...boostRequest(),steps: [{ part: 'work',resource: 'XGH2O',count: 2 },{ part: 'move',resource: 'ZO',count: 1 }] };
  store.submit(request,1); store.update(request.owner,request.id,job => { job.lab = 'old'; job.observed = [2,0]; });
  const creep = { id: request.unit,name: request.name,my: true,spawning: false,memory: { population: { owner: request.owner,home: request.home } },body: [{ type: 'work',hits: 100,boost: 'XGH2O' },{ type: 'work',hits: 100,boost: 'XGH2O' },{ type: 'move',hits: 100 }],pos: { isNearTo: () => true } };
  const room = { name: request.home,find: () => labs }, labs = [lab('old',null,0,0),lab('next','ZO',30,20)];
  function lab(id: string,mineralType: string | null,mineralAmount: number,energy: number) { return { id,my: true,structureType: 'lab',isActive: () => true,mineralType,mineralAmount,room,store: { getUsedCapacity: (resource: string) => resource === 'energy' ? energy : mineralAmount,getFreeCapacity: (resource: string) => resource === 'energy' ? 2000-energy : 3000-mineralAmount } }; }
  vi.stubGlobal('Game',{ time: 2,rooms: { [room.name]: room },getObjectById: (id: string) => id === creep.id ? creep : labs.find(item => item.id === id) });
  vi.stubGlobal('BOOSTS',{ work: { XGH2O: {} },move: { ZO: {} } }); vi.stubGlobal('FIND_MY_STRUCTURES',1); vi.stubGlobal('STRUCTURE_LAB','lab'); vi.stubGlobal('RESOURCE_ENERGY','energy'); vi.stubGlobal('LAB_MINERAL_CAPACITY',3000); vi.stubGlobal('LAB_BOOST_MINERAL',30); vi.stubGlobal('LAB_BOOST_ENERGY',20);
  const boost = vi.fn(() => 0), holdLab = vi.fn(() => true), dispatch = { structures: { boost,holdLab },activate: vi.fn(),movement: { move: vi.fn() } } as unknown as Pick<ReturnType<typeof createNativeDispatch>,'structures' | 'activate' | 'movement'>;
  const cycle = new NativeBoostCycle(state,dispatch,() => defaults);
  reserveBoostStock(state,store.get(request.owner,request.id)!,{ id: 'old',mineral: 'XGH2O',amount: 60,free: 2940,energy: 40,energyFree: 1960 },'XGH2O',60,40,1);
  return { state,store,request,cycle,boost,holdLab,labs,reset: () => { memory = JSON.parse(JSON.stringify(memory)); } };
}
test('next effect rebinds to its stocked lab across reset and releases old kit claims before reserving the new kit',() => {
  const f = fixture(); f.reset(); f.cycle.run(f.request.owner,f.request.id);
  expect(f.store.get(f.request.owner,f.request.id)).toMatchObject({ lab: 'next',status: 'issued',observed: [2,0],attempt: { resource: 'ZO',count: 1 } });
  expect(f.boost).toHaveBeenCalledOnce();
  const claim = createQuantityReservations(f.state).list(2).find(item => item.scope === boostScope(f.request))!;
  expect(claim.allocations.every(item => item.pool.includes('next'))).toBe(true);
});
test('old admitted hauling keeps its lab pin through reset and settlement before rebind',() => {
  const f = fixture(), owner = boostServiceOwner(f.request);
  reconcileServiceRequest(f.state,f.request.home,1,owner,0,{ direction: 'refill',source: 'bank',sink: 'old',resource: 'XGH2O',quantity: 10 });
  const queue = createLogisticsRequests(f.state,f.request.home), request = queue.pending(2)[0]!, pool = logisticsPool('request',owner,request.id), claims = createQuantityReservations(f.state);
  claims.reserve({ id: 'trip',owner,holder: 'courier',scope: 'trip',expiresAt: 10,allocations: [{ pool,amount: 10 }] },{ [pool]: 10 },1); f.reset();
  f.cycle.run(f.request.owner,f.request.id); expect(f.store.get(f.request.owner,f.request.id)!.lab).toBe('old'); expect(f.boost).not.toHaveBeenCalled(); expect(f.holdLab).not.toHaveBeenCalled(); expect(queue.pending(2)).toHaveLength(1);
  queue.confirm(owner,request.id,{ id: 'receipt',amount: 10 },2,1); claims.releaseScope('trip'); Game.time = 3;
  f.cycle.run(f.request.owner,f.request.id); expect(f.store.get(f.request.owner,f.request.id)!.lab).toBe('next'); expect(f.boost).toHaveBeenCalledOnce();
});
test('a single compatible lab retains the existing sequential-refill route',() => {
  const f = fixture(); f.labs.pop(); f.cycle.run(f.request.owner,f.request.id);
  expect(f.store.get(f.request.owner,f.request.id)).toMatchObject({ lab: 'old',status: 'pending' }); expect(f.boost).not.toHaveBeenCalled();
});
