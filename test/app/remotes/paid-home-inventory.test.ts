import { afterEach,expect,test,vi } from 'vitest';
import { observePaidHomeBodies } from '../../../src/app/remotes/startup/home-observation/bodies';
import { paidHomeAssets } from '../../../src/app/remotes/startup/home-observation/assets';
import { createPaidHomePhysicalInventory } from '../../../src/app/remotes/startup/hauling-state/inventory';
import type { PaidHomePhysicalInput } from '../../../src/app/remotes/startup/hauling-state/inventory';
import { paidHaulingStateFixture } from '../../fixtures/paid-hauling-state';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
afterEach(() => vi.unstubAllGlobals());
function fixture(): PaidHomePhysicalInput {
  const f = paidHaulingStateFixture('withdraw',50,100), point = { room: 'W0N1',x: 10,y: 25 };
  const paid = { request: 'courier',owner: 'fleet',body: ['carry','carry','move','move'] as ('carry' | 'move')[],startAt: 0,activeAt: 1,expiresAt: 1500,retireAt: 1400,capacity: 100 };
  const bank = { id: 'bank',room: 'W0N1',energy: 0,capacity: 1000,usedCapacity: 20,freeEnergyCapacity: 980,active: true };
  const body = { name: 'courier',unit: 'native',inventory: { id: 'native',room: 'W0N1',energy: 50,capacity: 100,usedCapacity: 50,freeEnergyCapacity: 50,active: true } };
  const resident = { name: 'resident',unit: 'resident-id',inventory: { id: 'resident-id',room: 'W0N1',energy: 10,capacity: 200,usedCapacity: 60,freeEnergyCapacity: 140,active: true } };
  return { observedAt: 11,endpoint: { id: 'bank',energy: 0,capacity: 1000,freeCapacity: 980 },inventories: [bank],bodies: [body,resident],
    workers: [{ name: 'courier',owner: 'fleet',position: point,spawning: false,ticksToLive: 1489,energy: 50,fatigue: 0,usedCapacity: 50,body: paid.body.map(type => ({ type,hits: 100,boost: null })) },
      { name: 'resident',owner: 'household',position: point,spawning: false,ticksToLive: 1000,energy: 10,fatigue: 0,usedCapacity: 60,body: [{ type: 'carry',hits: 100,boost: 'XKH2O' },{ type: 'move',hits: 100,boost: null }] }],
    sources: [{ miners: [],couriers: [{ paid,opening: f.opening,route: null }] }] };
}

test('native body stores use SDK energy capacity and total mixed usage, including spawning bodies', () => {
  vi.stubGlobal('RESOURCE_ENERGY','energy');
  const creep = { id: 'native',name: 'courier',pos: { roomName: 'W0N1' },spawning: false,body: [{ type: 'carry',hits: 100,boost: 'XKH2O' }],
    store: { energy: 10,H: 50,getUsedCapacity: (resource?: string) => resource ? 10 : 60,getCapacity: () => 200,getFreeCapacity: () => 140 } };
  expect(observePaidHomeBodies([creep as unknown as Creep])[0]!.inventory).toEqual({ id: 'native',room: 'W0N1',energy: 10,capacity: 200,usedCapacity: 60,freeEnergyCapacity: 140,active: true });
  creep.spawning = true; expect(observePaidHomeBodies([creep as unknown as Creep])[0]!.inventory.active).toBe(false);
});

test('canonical physical inventory includes paid and outside bodies without treating cargo as bank energy', () => {
  const input = fixture(),before = JSON.stringify(input),world = createPaidHomePhysicalInventory(input);
  expect(world.snapshot().map(store => store.id)).toEqual(['bank','native','resident-id']);
  world.begin(11); expect(world.observe('bank')!.energy).toBe(0); expect(world.observe('resident-id')!.capacity).toBe(200);
  expect(world.observe('resident-id')!.freeEnergyCapacity).toBe(140);
  world.observe('native')!.energy = 0; expect(world.observe('native')!.energy).toBe(50);
  expect(JSON.stringify(input)).toBe(before);
});

test('contradictory body identity, paid capacity, bank stock and duplicate physical stores refuse', () => {
  const capacity = fixture(); capacity.bodies[0]!.inventory.capacity = 200;
  expect(() => createPaidHomePhysicalInventory(capacity)).toThrow('Paid physical body store');
  const missing = fixture(); missing.bodies.pop(); expect(() => createPaidHomePhysicalInventory(missing)).toThrow('roster');
  const bank = fixture(); bank.endpoint.freeCapacity = 1000; expect(() => createPaidHomePhysicalInventory(bank)).toThrow('bank');
  const overlap = fixture(); overlap.bodies[1]!.unit = 'bank'; overlap.bodies[1]!.inventory.id = 'bank';
  expect(() => createPaidHomePhysicalInventory(overlap)).toThrow('identities');
  const old = fixture(); old.sources[0]!.couriers[0]!.opening.observed.observedAt = 10;
  expect(() => createPaidHomePhysicalInventory(old)).toThrow('Paid physical body identity');
});

test('a quoted container bank is observed even outside owned structures and its stock pool stays selected', () => {
  vi.stubGlobal('RESOURCE_ENERGY','energy'); vi.stubGlobal('FIND_MY_STRUCTURES',1); vi.stubGlobal('FIND_MY_SPAWNS',2);
  const bank = { id: 'bank',structureType: 'container',pos: { roomName: 'W0N1',x: 10,y: 25 },isActive: () => true,
    store: { energy: 20,getUsedCapacity: (resource?: string) => resource ? 20 : 30,getCapacity: () => 100,getFreeCapacity: () => 70 } };
  const home = { name: 'W0N1',controller: { my: true },energyAvailable: 0,energyCapacityAvailable: 0,find: () => [] };
  vi.stubGlobal('Game',{ time: 11,creeps: {},rooms: { W0N1: home },getObjectById: () => bank });
  const write = vi.fn(() => { throw new Error('Unexpected owner write'); });
  const result = paidHomeAssets({ read: () => undefined,write },{ availableEnergy: (_home,energy) => energy },'W0N1','bank',() => true)!;
  expect(result.inventories).toEqual([{ id: 'bank',room: 'W0N1',energy: 20,capacity: 100,usedCapacity: 30,freeEnergyCapacity: 70,active: true }]);
  expect(result.pools).toContain(logisticsPool('stock','bank','energy'));
  expect(result.stock.totalEnergy).toBe(0); expect(write).not.toHaveBeenCalled();
});
