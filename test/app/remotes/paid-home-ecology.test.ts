import { afterEach,expect,test,vi } from 'vitest';
import { observePaidHomeEcology } from '../../../src/app/remotes/startup/home-observation/ecology';
import { observePaidHomeInventory } from '../../../src/app/remotes/startup/home-observation/inventory';
import { createPaidHomePhysicalInventory } from '../../../src/app/remotes/startup/hauling-state/inventory';
import { paidHomeClaims } from '../../../src/app/remotes/startup/home-observation/claims';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import type { PaidHomePhysicalInput } from '../../../src/app/remotes/startup/hauling-state/inventory';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  for (const [key,value] of Object.entries({ RESOURCE_ENERGY: 'energy',STRUCTURE_CONTAINER: 'container',FIND_SOURCES: 1,FIND_DROPPED_RESOURCES: 2,FIND_STRUCTURES: 3,ENERGY_DECAY: 1000,ENERGY_REGEN_TIME: 300 })) vi.stubGlobal(key,value);
  const point = (roomName: string,x: number,y: number) => ({ roomName,x,y });
  const source = { id: 'source',pos: point('E0N1',20,20),energy: 1234,energyCapacity: 3000,ticksToRegeneration: 17,effects: [] as { effect: number; ticksRemaining: number }[] };
  const store = (energy: number,other: number,capacity: number) => ({ energy,U: other,getUsedCapacity: (resource?: string) => resource ? energy : energy+other,getCapacity: () => capacity,getFreeCapacity: () => capacity-energy-other });
  const bank = { id: 'bank',structureType: 'container',pos: point('W0N1',10,10),hits: 100,isActive: () => true,store: store(100,0,1000) };
  const extra = { id: 'outside-container',structureType: 'container',pos: point('E0N1',19,20),hits: 100,isActive: () => true,store: store(10,20,2000) };
  const drops = [{ pos: point('E0N1',19,20),resourceType: 'energy',amount: 7 },{ pos: point('E0N1',20,19),resourceType: 'U',amount: 9 }];
  const room = (sources: unknown[],resources: unknown[],structures: unknown[]) => ({ find: (kind: number) => kind === 1 ? sources : kind === 2 ? resources : structures });
  const rooms: Record<string,unknown> = { W0N1: room([],[],[bank]),E0N1: room([source],drops,[extra]) };
  vi.stubGlobal('Game',{ time: 100,rooms });
  const workers = [{ name: 'resident',owner: 'household',position: { room: 'E0N1',x: 19,y: 20 },spawning: false,ticksToLive: 100,energy: 0,usedCapacity: 0,fatigue: 0,body: [] }];
  const bankFact = observePaidHomeInventory(bank as unknown as StructureContainer);
  const capture = () => observePaidHomeEcology('W0N1',[],workers,[bankFact],() => true);
  return { source,extra,bank,workers,bankFact,rooms,capture };
}

test('native ecology includes outside containers and energy drops without cash conversion, detached from SDK objects', () => {
  const f = fixture(),before = JSON.stringify({ source: f.source,extra: f.extra }),captured = f.capture();
  expect(captured.ecology).toEqual({ sources: [{ id: 'source',position: { room: 'E0N1',x: 20,y: 20 },energy: 1234,capacity: 3000,regenerationIn: 17,regenerationTicks: 300 }],
    ground: [{ position: { room: 'E0N1',x: 19,y: 20 },energy: 7 }],containers: [{ id: 'outside-container',position: { room: 'E0N1',x: 19,y: 20 } },{ id: 'bank',position: { room: 'W0N1',x: 10,y: 10 } }],decayDivisor: 1000 });
  expect(captured.inventories.find(store => store.id === 'outside-container')).toMatchObject({ energy: 10,usedCapacity: 30,freeEnergyCapacity: 1970 });
  const input: PaidHomePhysicalInput = { observedAt: 100,endpoint: { id: 'bank',energy: 100,capacity: 1000,freeCapacity: 900 },...captured,bodies: [],workers: [],sources: [] };
  const world = createPaidHomePhysicalInventory(input); world.begin(100); expect(world.source('source')!.energy).toBe(1234); expect(world.observe('bank')!.energy).toBe(100);
  captured.ecology.sources[0]!.position.x = 1; expect(f.source.pos.x).toBe(20);
  expect(JSON.stringify({ source: f.source,extra: f.extra })).toBe(before);
});

test('new outside-container pools preserve their existing outside claims', () => {
  const f = fixture(),captured = f.capture(),pool = logisticsPool('stock','outside-container','energy');
  const claim = { id: 'resident',owner: 'household',holder: 'resident',scope: 'withdraw',expiresAt: 110,allocations: [{ pool,amount: 5 }] };
  const partition = paidHomeClaims([claim],captured.inventories.flatMap(store => [store.capacityPool,logisticsPool('stock',store.id,'energy')]),[]);
  expect(partition.external).toEqual([claim]);
});

test('unmodelled power effects, missing visibility and budget refusal invalidate capture', () => {
  const powered = fixture(); powered.source.effects.push({ effect: 13,ticksRemaining: 10 }); expect(powered.capture).toThrow('power effects');
  const unseen = fixture(); delete unseen.rooms.E0N1; expect(unseen.capture).toThrow('visible');
  const budget = fixture(); expect(() => observePaidHomeEcology('W0N1',[],budget.workers,[budget.bankFact],() => false)).toThrow('budget');
});

test('contradictory existing container stock and overlarge ground observations refuse rather than truncate', () => {
  const f = fixture(); f.bankFact.energy--;
  expect(f.capture).toThrow('Conflicting');
  const large = fixture(); large.rooms.E0N1 = { find: (kind: number) => kind === 2 ? Array.from({ length: 257 },(_,index) => ({ pos: { roomName: 'E0N1',x: index%50,y: Math.floor(index/50) },resourceType: 'energy',amount: 1 })) : [] };
  expect(large.capture).toThrow('bounds');
});
