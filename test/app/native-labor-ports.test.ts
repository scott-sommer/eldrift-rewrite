import { afterEach, expect, test, vi } from 'vitest';
import { createNativeLaborTaskPorts } from '../../src/app/native-labor/ports';
import { laborScope } from '../../src/app/native-labor/claims';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createQuantityReservations } from '../../src/persistence/quantities/store';
import { logisticsPool } from '../../src/capabilities/logistics/request';
import { laborProposalFixture } from '../fixtures/household-labor-proposal';
import type { LaborTaskPayload } from '../../src/features/work/labor-task';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const f = laborProposalFixture(), ready = f.propose(f.input); if (ready.status !== 'ready') throw new Error('Expected proposal');
  const payload: LaborTaskPayload = { proposal: ready.read() }, root = {},state = createMemoryPort(() => root);
  let tick = 10,enabled = true;
  const home = { name: 'W0N1',controller: { my: true } }, source = { id: 'stock',pos: { roomName: 'W0N1',x: 2,y: 2 },structureType: 'storage',my: true,isActive: () => true,store: { energy: 100,getFreeCapacity: () => 900,getCapacity: () => 1000 } };
  const site = { id: 'target',pos: { roomName: 'W0N1',x: 8,y: 1 },structureType: 'road',my: true,progress: 297,progressTotal: 300 };
  const creep = { id: 'actor',name: 'worker',memory: { population: { owner: 'home',home: 'W0N1' } },body: [{ type: 'work',hits: 100 },{ type: 'carry',hits: 100 },{ type: 'move',hits: 100 }],pos: { roomName: 'W0N1',x: 2,y: 1 },store: { energy: 0,getCapacity: () => 50,getFreeCapacity: () => 50 },spawning: false,withdraw: vi.fn(() => 0),build: vi.fn(() => 0),transfer: vi.fn(() => 0) };
  vi.stubGlobal('RESOURCE_ENERGY','energy'); vi.stubGlobal('Game',{ get time() { return tick; },rooms: { W0N1: home },getObjectById: (id: string) => id === 'stock' ? source : id === 'target' ? site : null });
  const arbiter = createActionArbiter(() => tick), movement = { move: vi.fn(() => ({ status: 'running' as const })),flush: vi.fn() };
  const ports = createNativeLaborTaskPorts(state,{ arbiter,movement },{ enabled: () => enabled,completed: () => {} });
  return { root,state,payload,source,site,creep: creep as unknown as Creep,raw: creep,arbiter,ports,owner: laborScope(payload),claims: createQuantityReservations(state),at: (value: number) => { tick = value; },enable: (value: boolean) => { enabled = value; } };
}
test('accepted pickup reserves source stock, duplicate admission preserves it, and next-tick observation releases it',() => {
  const f = fixture(); expect(f.ports.authorized(f.creep,f.payload)).toBe(true); expect(f.claims.list(10)[0]?.allocations).toEqual([{ pool: logisticsPool('capacity','actor'),amount: 50 }]);
  expect(f.ports.pickup(f.creep,f.payload,3,f.owner)).toBe(true); expect(f.claims.list(10)).toHaveLength(2);
  expect(f.ports.pickup(f.creep,f.payload,3,f.owner)).toBe(false); expect(f.claims.list(10)).toHaveLength(2); expect(f.raw.withdraw).toHaveBeenCalledTimes(1);
  f.payload.progress = { worker: 'actor',picked: 0,spent: 0,returned: 0,pending: { kind: 'pickup',tick: 10,before: 0,maximum: 3 } };
  f.at(11); expect(f.ports.authorized(f.creep,f.payload)).toBe(true); expect(f.claims.list(11).flatMap(claim => claim.allocations)).toEqual([{ pool: logisticsPool('capacity','actor'),amount: 50 }]);
  f.raw.withdraw.mockReturnValueOnce(-6); expect(f.ports.pickup(f.creep,f.payload,3,f.owner)).toBe(false); expect(f.claims.list(11).flatMap(claim => claim.allocations)).toEqual([{ pool: logisticsPool('capacity','actor'),amount: 50 }]);
});
test('stock reserve and competing target budgets refuse without native effects',() => {
  const f = fixture(); f.source.store.energy = 22; expect(f.ports.pickup(f.creep,f.payload,3,f.owner)).toBe(false); expect(f.raw.withdraw).not.toHaveBeenCalled();
  f.raw.pos.x = 5; f.raw.store.energy = 3; const pool = logisticsPool('work','target','build');
  f.claims.reserve({ id: 'other',owner: 'other',holder: 'other',scope: 'other',expiresAt: 26,allocations: [{ pool,amount: 3 }] },{ [pool]: 3 },10);
  expect(f.ports.work(f.creep,f.payload,3,f.owner)).toBe(false); expect(f.raw.build).not.toHaveBeenCalled(); expect(f.claims.list(10).map(item => item.id)).toEqual(['other']);
  const capacity = logisticsPool('capacity','stock'); f.raw.pos.x = 2;
  f.claims.reserve({ id: 'incoming',owner: 'other',holder: 'other',scope: 'other',expiresAt: 26,allocations: [{ pool: capacity,amount: 900 }] },{ [capacity]: 900 },10);
  expect(f.ports.deposit(f.creep,f.payload,3,f.owner)).toBe(false); expect(f.raw.transfer).not.toHaveBeenCalled();
});
test('disabled policy, boosts, mismatched scope and another action owner block effects',() => {
  const f = fixture(); expect(f.ports.worker(undefined as unknown as Creep)).toBeUndefined(); f.enable(false); expect(f.ports.authorized(f.creep,f.payload)).toBe(false); f.enable(true);
  f.creep.body[0]!.boost = 'XGH2O'; expect(f.ports.authorized(f.creep,f.payload)).toBe(false); delete f.creep.body[0]!.boost;
  expect(f.ports.pickup(f.creep,f.payload,3,'other-scope')).toBe(false); expect(f.root).toEqual({});
  f.arbiter.claim(f.creep.name,'other-owner'); expect(f.ports.authorized(f.creep,f.payload)).toBe(false);
  expect(f.ports.pickup(f.creep,f.payload,3,f.owner)).toBe(false); expect(f.raw.withdraw).not.toHaveBeenCalled();
});

test('a pre-existing incoming capacity claim prevents labor ownership without erasing the delivery',() => {
  const f = fixture(), pool = logisticsPool('capacity','actor');
  f.claims.reserve({ id: 'incoming',owner: 'hauling',holder: 'hauler',scope: 'hauler-task',expiresAt: 26,allocations: [{ pool,amount: 1 }] },{ [pool]: 50 },10);
  expect(f.ports.authorized(f.creep,f.payload)).toBe(false); expect(f.claims.list(10).map(claim => claim.id)).toEqual(['incoming']);
  expect(f.raw.withdraw).not.toHaveBeenCalled();
});

test('disabled productive work still permits an owned refund and releases only its observed allocation',() => {
  const f = fixture(); f.ports.authorized(f.creep,f.payload); f.enable(false); f.raw.store.energy = 3;
  expect(f.ports.recoverable?.(f.creep,f.payload)).toBe(true);
  expect(f.ports.deposit(f.creep,f.payload,3,f.owner)).toBe(true);
  expect(f.claims.list(10)).toHaveLength(2);
  f.payload.progress = { worker: 'actor',picked: 3,spent: 0,returned: 0,pending: { kind: 'return',tick: 10,before: 3,maximum: 3 },failure: { reason: 'labor-authority',tick: 10 } };
  f.at(11); f.raw.store.energy = 0; expect(f.ports.recoverable?.(f.creep,f.payload)).toBe(true);
  expect(f.claims.list(11).flatMap(claim => claim.allocations)).toEqual([{ pool: logisticsPool('capacity','actor'),amount: 50 }]);
});
