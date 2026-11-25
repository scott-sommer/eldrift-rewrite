import { createSpawnCoordinator } from '../../../src/features/population/spawn-coordinator';
import { createSpawnQueue } from '../../../src/features/population/spawn-queue';
import { afterEach, expect, test, vi } from 'vitest';
import { createNativeStartupEnergyAdmission } from '../../../src/app/remotes/startup/energy-admission';
import { createNativeStructureActions } from '../../../src/adapters/screeps/structure-actions';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import type { BodyPart } from '../../../src/capabilities/spawning/body';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  for (const [key,value] of Object.entries({ FIND_MY_STRUCTURES: 1,RESOURCE_ENERGY: 'energy',OK: 0,ERR_INVALID_TARGET: -7,ERR_NOT_ENOUGH_ENERGY: -6,ERR_BUSY: -4,BODYPART_COST: { work: 100,carry: 50,move: 50 } })) vi.stubGlobal(key,value);
  const room = { name: 'W0N1',controller: { my: true },energyAvailable: 500,find: () => points };
  const native = vi.fn(() => 0);
  const point = (id: string,structureType: string,x: number,energy: number,capacity: number) => ({ id,structureType,my: true,isActive: () => true,room,pos: { roomName: room.name,x,y: 10 },store: { energy,getCapacity: () => capacity },spawnCreep: native });
  const points = [point('spawn','spawn',10,300,300),point('second','spawn',20,100,300),point('a','extension',11,50,50),point('b','extension',12,50,50)];
  vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: room },getObjectById: (id: string) => points.find(point => point.id === id) ?? null });
  const root = {},state = createMemoryPort(() => root), guard = createNativeStartupEnergyAdmission(state);
  const make = () => createNativeStructureActions(state,() => ({}),guard);
  const assignment = (id: string,body: BodyPart[],spawn = 'spawn') => ({ spawn,cost: 0,request: { id,name: id,owner: 'population',room: room.name,body,priority: 0,readyAt: 0,expiresAt: 10 } });
  return { state,root,guard,points,native,make,assignment };
}
test('unsafe reserved debit refuses before intent slot/budget reservation and a cheaper safe body can proceed',() => {
  const f = fixture(); f.state.write('quantity-reservations/empire',{ owner: 'quantity-reservations',version: 1,data: { claims: [{ id: 'claim',owner: 'other',holder: 'worker',scope: 'home',expiresAt: 10,allocations: [{ pool: logisticsPool('stock','spawn','energy'),amount: 100 }] }] } });
  const actions = f.make(); expect(actions.spawn(f.assignment('unsafe',['work','work','move']))).toBe(-6);
  expect(actions.availableSpawn('spawn')).toBe(true); expect(actions.availableEnergy('W0N1',500)).toBe(500); expect(f.native).not.toHaveBeenCalled();
  expect(actions.spawn(f.assignment('safe',['work','carry','move']))).toBe(0);
  expect(f.native).toHaveBeenCalledWith(['work','carry','move'],'safe',expect.objectContaining({ energyStructures: f.points }));
});
test('SDK accepted spawns share the pending physical debit across two origins',() => {
  const f = fixture(), actions = f.make(); expect(actions.spawn(f.assignment('first',['work','work','work']))).toBe(0);
  expect(actions.spawn(f.assignment('second',['work','carry','move'],'second'))).toBe(0);
  expect(actions.availableEnergy('W0N1',500)).toBe(0); expect(f.native).toHaveBeenCalledTimes(2);
});
test('same-tick guard recreation refuses unknown durable pending debits; next tick starts a new observation',() => {
  const f = fixture(); expect(f.make().spawn(f.assignment('first',['work','work','work']))).toBe(0);
  const recreated = createNativeStructureActions(f.state,() => ({}),createNativeStartupEnergyAdmission(f.state));
  expect(recreated.spawn(f.assignment('second',['carry','move'],'second'))).toBe(-6);
  Game.time++; expect(recreated.spawn(f.assignment('next',['carry','move'],'second'))).toBe(0);
});
test('rejected SDK calls retain scalar admission and do not fabricate accepted physical debits',() => {
  const f = fixture(); f.native.mockReturnValue(-10); const actions = f.make(); expect(actions.spawn(f.assignment('failed',['carry','move']))).toBe(-10);
  f.native.mockReturnValue(0); expect(actions.spawn(f.assignment('later',['carry','move'],'second'))).toBe(-6); expect(f.native).toHaveBeenCalledTimes(1);
});
test('stock changes after acceptance refuse further physical plans instead of dropping accepted debits',() => {
  const f = fixture(); expect(f.make().spawn(f.assignment('first',['carry','move']))).toBe(0); f.points[1]!.store.energy--;
  expect(f.make().spawn(f.assignment('later',['carry','move'],'second'))).toBe(-6); expect(f.native).toHaveBeenCalledTimes(1);
});

test('prepared coordinator skips unsafe physical requests and admits a cheaper body in the same sealed flush',() => {
  const f = fixture(); f.state.write('quantity-reservations/empire',{ owner: 'quantity-reservations',version: 1,data: { claims: [{ id: 'held',owner: 'other',holder: 'worker',scope: 'home',expiresAt: 10,allocations: [{ pool: logisticsPool('stock','spawn','energy'),amount: 100 }] }] } });
  const queue = createSpawnQueue(f.state,'W0N1'), actions = f.make();
  queue.submit({ ...f.assignment('unsafe',['work','work','move']).request,priority: 0 });
  queue.submit({ ...f.assignment('safe',['work','carry','move']).request,priority: 1 });
  const make = () => createSpawnCoordinator(f.state,{ clock: () => Game.time,invoke: actions.spawn },() => ({ rooms: ['W0N1'],slots: actions.availableSpawn('spawn') ? [{ id: 'spawn',room: 'W0N1',busy: false }] : [],energy: { W0N1: actions.availableEnergy('W0N1',500) },names: new Set() }),'skip',actions.preflightSpawn);
  expect(make()().map(receipt => [receipt.request,receipt.status])).toEqual([['unsafe','rejected'],['safe','accepted']]);
  expect(f.native).toHaveBeenCalledTimes(1); expect(actions.availableEnergy('W0N1',500)).toBe(300); expect(make()()).toEqual([]);
});
