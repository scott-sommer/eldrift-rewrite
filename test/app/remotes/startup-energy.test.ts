import { afterEach, expect, test, vi } from 'vitest';
import { observeNativeStartupEnergy } from '../../../src/app/remotes/startup/energy';
import { orderedSpawnEnergy } from '../../../src/adapters/screeps/spawn-energy';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  vi.stubGlobal('FIND_MY_STRUCTURES',1); vi.stubGlobal('RESOURCE_ENERGY','energy');
  const point = (id: string,structureType: string,x: number,energy: number,capacity: number) => ({ id,structureType,my: true,isActive: () => true,pos: { roomName: 'W0N1',x,y: 10 },store: { energy,getCapacity: () => capacity } });
  const spawn = point('spawn','spawn',10,300,300), second = point('second','spawn',20,100,300);
  const a = point('a','extension',11,50,50), b = point('b','extension',9,50,50), inactive = point('inactive','extension',12,50,50); inactive.isActive = () => false;
  const points = [b,second,a,inactive,spawn], root = {},state = createMemoryPort(() => root);
  const home = { controller: { my: true },find: () => points }; vi.stubGlobal('Game',{ time: 5,rooms: { W0N1: home } });
  return { spawn,second,a,b,points,root,state,home };
}
test('native snapshot orders spawns before extensions and resolves range ties deterministically without writes',() => {
  const f = fixture(), before = JSON.stringify(f.root), result = observeNativeStartupEnergy(f.state,'W0N1',['spawn','second']);
  expect(result).toMatchObject({ status: 'observed',policy: 'spawn-first-range-id-v1',initialEnergy: 500,capacity: 700 });
  if (result.status !== 'observed') throw new Error('Expected snapshot');
  expect(result.layout.orders[0]!.structures).toEqual(['spawn','second','a','b']);
  expect(result.layout.orders[1]!.structures).toEqual(['second','spawn','a','b']);
  f.points.reverse(); expect(observeNativeStartupEnergy(f.state,'W0N1',['spawn'])).toMatchObject({ layout: { orders: [result.layout.orders[0]] } });
  expect(JSON.stringify(f.root)).toBe(before); f.spawn.store.energy = 0; expect(result.layout.structures.find(point => point.id === 'spawn')!.energy).toBe(300);
});
test('current liabilities reduce both scalar and point budgets; expired claims do not',() => {
  const f = fixture(); f.state.write('quantity-reservations/empire',{ owner: 'quantity-reservations',version: 1,data: { claims: [
    { id: 'active',owner: 'other',holder: 'worker',scope: 'home',expiresAt: 10,allocations: [{ pool: logisticsPool('stock','spawn','energy'),amount: 100 },{ pool: logisticsPool('capacity','second'),amount: 50 }] },
    { id: 'expired',owner: 'other',holder: 'worker',scope: 'home',expiresAt: 5,allocations: [{ pool: logisticsPool('stock','a','energy'),amount: 50 }] },
  ] } });
  const before = JSON.stringify(f.root); expect(observeNativeStartupEnergy(f.state,'W0N1',['spawn'])).toMatchObject({ status: 'observed',initialEnergy: 400,capacity: 550 }); expect(JSON.stringify(f.root)).toBe(before);
});
test('missing origin and excessive current liabilities defer instead of inventing available stock',() => {
  const f = fixture(); expect(observeNativeStartupEnergy(f.state,'W0N1',['missing'])).toMatchObject({ status: 'deferred',reason: 'origin' });
  f.state.write('quantity-reservations/empire',{ owner: 'quantity-reservations',version: 1,data: { claims: [{ id: 'held',owner: 'other',holder: 'worker',scope: 'home',expiresAt: 10,allocations: [{ pool: logisticsPool('stock','spawn','energy'),amount: 301 }] }] } });
  expect(observeNativeStartupEnergy(f.state,'W0N1',['spawn'])).toMatchObject({ status: 'deferred',reason: 'liabilities' });
});
test('the shared order excludes foreign and inactive structures',() => {
  const f = fixture(); f.a.my = false;
  expect(orderedSpawnEnergy(f.spawn as unknown as StructureSpawn,f.points as unknown as (StructureSpawn | StructureExtension)[]).map(point => point.id)).toEqual(['spawn','second','b']);
});
