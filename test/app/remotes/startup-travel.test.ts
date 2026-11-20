import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { createNativeStartupTravel } from '../../../src/app/remotes/startup/travel/native';
import { startupTravelPlan } from '../../fixtures/startup-travel';
import type { NativeStartupTravelRequest } from '../../../src/app/remotes/startup/travel/model';
const controls = vi.hoisted(() => ({ observe: vi.fn(),measure: vi.fn(),topology: 'before',blocked: false }));
vi.mock('../../../src/app/remotes/startup/travel/context',() => ({ createStartupTravelContext: () => controls.observe }));
vi.mock('../../../src/app/remotes/assessment/matrices',() => ({ prepareRemoteMatrices: () => ({ version: controls.topology,matrix: () => ({ get: () => controls.blocked ? 255 : 0 }) }) }));
vi.mock('../../../src/app/remotes/assessment/travel',() => ({ measureRemoteLeg: (...args: unknown[]) => controls.measure(...args) }));
vi.mock('../../../src/adapters/screeps/matrix-snapshots',() => ({ createMatrixSnapshots: () => ({}) }));
beforeEach(() => {
  controls.topology = 'before'; controls.blocked = false; controls.observe.mockReset(); controls.measure.mockReset();
  controls.measure.mockImplementation((_context,leg) => ({ status: 'complete',ticks: 12,operations: 30,arrival: { ...leg.destination } }));
  vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: { getTerrain: () => ({ get: () => 0 }) },E0N1: { getTerrain: () => ({ get: () => 0 }) } } });
  vi.stubGlobal('TERRAIN_MASK_WALL',1);
});
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const root = {},state = createMemoryPort(() => root), plan = startupTravelPlan();
  const request: NativeStartupTravelRequest = { target: { home: plan.home,room: plan.room,source: plan.source,station: plan.station,endpoint: plan.endpoint.id,username: 'me',tick: 1 },
    spawn: plan.spawn.id,exit: plan.spawn.exit,collection: plan.collection,deposit: plan.endpoint.deposit,miner: plan.miner,courier: plan.courier,
    traversal: { mode: 'known-safe',username: 'me',allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,maximumAge: 200,maximumRooms: 128,unknownCost: 8,staleCost: 4,keeperCost: 25 } };
  // The controlled context isolates cache admission/freshness from the separately native-qualified observer.
  const context = { status: 'ready',plan,rooms: [plan.home,plan.room],route: 'safe-route',intel: vi.fn(),
    facts: { observedAt: 1,authority: { assignment: 'lease',generation: 1,expiresAt: 10 },stock: { availableEnergy: 1000 } } };
  controls.observe.mockImplementation(() => context);
  const options = { maximumRooms: 8,maximumOps: 4000 }, quote = createNativeStartupTravel(state,{ availableEnergy: (_home,energy) => energy },options);
  return { root,state,plan,request,context,options,quote };
}
test('a completed geometric cache still requires current context admission before reuse',() => {
  const f = fixture(); expect(f.quote(f.request).status).toBe('complete'); expect(controls.measure).toHaveBeenCalledTimes(5);
  const before = JSON.stringify(f.root); controls.observe.mockReturnValue({ status: 'deferred',reason: 'vision' });
  expect(f.quote(f.request)).toEqual({ status: 'deferred',reason: 'vision',completedLegs: 0 });
  expect(controls.measure).toHaveBeenCalledTimes(5); expect(JSON.stringify(f.root)).toBe(before);
});
test('renewing the same authority retains geometry but completion carries fresh stock and observation time',() => {
  const f = fixture(); expect(f.quote(f.request,2)).toMatchObject({ status: 'deferred',completedLegs: 2 });
  Game.time = 2; f.request.target.tick = 2; f.context.facts.observedAt = 2; f.context.facts.stock.availableEnergy = 950; f.context.facts.authority.expiresAt = 11;
  const result = f.quote(f.request); expect(result).toMatchObject({ status: 'complete',observedAt: 2,facts: { stock: { availableEnergy: 950 } } });
  expect(controls.measure).toHaveBeenCalledTimes(5);
});
test('changed topology or assignment generation starts a new geometric measurement',() => {
  const f = fixture(); f.quote(f.request,2); controls.measure.mockClear(); controls.topology = 'after';
  expect(f.quote(f.request,1)).toMatchObject({ completedLegs: 1 });
  f.context.facts.authority.generation = 2; expect(f.quote(f.request,1)).toMatchObject({ completedLegs: 1 });
  expect(controls.measure.mock.calls.map(call => call[1].kind)).toEqual(['miner-approach','miner-approach']);
});
test('a blocked service tile or invalid safety policy cannot reuse cached work',() => {
  const f = fixture(); f.quote(f.request,2); const before = JSON.stringify(f.root); controls.blocked = true;
  expect(f.quote(f.request)).toMatchObject({ status: 'deferred',reason: 'service-tile' }); expect(JSON.stringify(f.root)).toBe(before);
  f.request.traversal.username = 'other'; expect(() => f.quote(f.request)).toThrow('safety policy');
});
test('constructor search limits are validated and detached from caller mutation',() => {
  const f = fixture(); f.options.maximumOps = 9000; f.quote(f.request,1);
  expect(controls.measure.mock.calls[0]![3]).toBe(4000);
  expect(() => createNativeStartupTravel(f.state,{ availableEnergy: (_home,energy) => energy },{ maximumRooms: 1,maximumOps: 100001 })).toThrow('search bound');
});
