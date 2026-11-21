import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createNativeHouseholdTravel } from '../../../src/app/remotes/startup/household/travel';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import { householdTravelPlan } from '../../fixtures/household-travel';
const controls = vi.hoisted(() => ({ topology: 'before',blocked: false }));
vi.mock('../../../src/adapters/screeps/matrix-snapshots',() => ({ createMatrixSnapshots: () => ({}) }));
vi.mock('../../../src/app/remotes/assessment/matrices',() => ({ prepareRemoteMatrices: () => ({ version: controls.topology,matrix: () => ({ get: () => controls.blocked ? 255 : 0 }) }) }));
vi.mock('../../../src/app/remotes/assessment/travel',() => ({ measureRemoteLeg: (_context: unknown,leg: { destination: object }) => ({ status: 'complete',ticks: 2,operations: 3,arrival: { ...leg.destination } }) }));
beforeEach(() => { controls.topology = 'before'; controls.blocked = false; vi.stubGlobal('RESOURCE_ENERGY','energy'); vi.stubGlobal('TERRAIN_MASK_WALL',1); });
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const root = {}, state = createMemoryPort(() => root), plan = householdTravelPlan();
  const pos = (point: { room: string; x: number; y: number }) => ({ roomName: point.room,x: point.x,y: point.y });
  const bank = { id: 'bank',structureType: 'storage',my: true,isActive: () => true,pos: pos(plan.source.position),store: { energy: 700,getCapacity: () => 1000,getFreeCapacity: () => 300 } };
  const spawn = { id: 'spawn',structureType: 'spawn',my: true,isActive: () => true,pos: pos(plan.spawn.position),store: { energy: 200,getCapacity: () => 300,getFreeCapacity: () => 100 } };
  const objects: Record<string,unknown> = { bank,spawn };
  vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: { name: 'W0N1',controller: { my: true },energyCapacityAvailable: 2300,getTerrain: () => ({ get: () => 0 }) } },getObjectById: (id: string) => objects[id] ?? null });
  return { root,state,plan,bank,spawn,objects,quote: createNativeHouseholdTravel(state,4000) };
}
test('read-only observation reports actual single destination capacity and active stock/capacity claims',() => {
  const f = fixture(); f.state.write('quantity-reservations/empire',{ owner: 'quantity-reservations',version: 1,data: { claims: [{ id: 'claims',owner: 'other',holder: 'worker',scope: 'room',expiresAt: 10,
    allocations: [{ pool: logisticsPool('stock','bank','energy'),amount: 200 },{ pool: logisticsPool('capacity','spawn'),amount: 40 }] }] } });
  const before = JSON.stringify(f.root), result = f.quote(f.plan);
  expect(result).toMatchObject({ status: 'complete',observedAt: 1,source: { availableEnergy: 500 },destination: { capacity: 300,freeCapacity: 100,availableCapacity: 60 } });
  expect(JSON.stringify(f.root)).toBe(before);
});
test('current topology and missing/foreign endpoints prevent reuse of old geometry',() => {
  const f = fixture(), first = f.quote(f.plan); controls.topology = 'after'; const next = f.quote(f.plan);
  if (first.status !== 'complete' || next.status !== 'complete') throw new Error('Expected quotes'); expect(next.identity).not.toBe(first.identity);
  f.spawn.my = false; expect(f.quote(f.plan)).toMatchObject({ status: 'deferred',reason: 'endpoint' });
  f.spawn.my = true; delete f.objects.bank; expect(f.quote(f.plan)).toMatchObject({ status: 'deferred',reason: 'endpoint' });
});
test('blocked service tiles and guard refusal never publish or reserve state',() => {
  const f = fixture(), before = JSON.stringify(f.root); controls.blocked = true;
  expect(f.quote(f.plan)).toMatchObject({ status: 'deferred',reason: 'service-tile' });
  expect(f.quote(f.plan,() => false)).toMatchObject({ status: 'deferred',reason: 'admission' }); expect(JSON.stringify(f.root)).toBe(before);
});
