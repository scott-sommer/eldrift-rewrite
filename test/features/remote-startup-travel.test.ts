import { expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createStartupTravel } from '../../src/features/remotes/startup/travel';
import { createStartupTravelProgress } from '../../src/features/remotes/startup/travel-progress';
import { startupTravelLegs } from '../../src/features/remotes/startup/travel-plan';
import { startupTravelPlan } from '../fixtures/startup-travel';
import type { StartupTravelLegRequest } from '../../src/features/remotes/startup/travel-model';
const measured = (request: StartupTravelLegRequest) => ({ status: 'complete' as const,ticks: 12,operations: 30,arrival: { ...request.destination } });
function fixture() {
  const root = {},state = createMemoryPort(() => root), measure = vi.fn(measured), plan = startupTravelPlan();
  return { root,state,measure,plan,advance: createStartupTravel(state,plan.home,measure) };
}
test('five exact legs distinguish spawn approach, steady empty travel and loaded return from pinned service tiles',() => {
  const f = fixture(), result = f.advance(f.plan,'topology',1,5,() => true);
  expect(result.status).toBe('complete'); if (result.status !== 'complete') return;
  expect(result.operations).toBe(150);
  expect(result.legs.map(leg => leg.kind)).toEqual(['miner-approach','miner-return','courier-approach','courier-empty','courier-loaded']);
  expect(f.measure.mock.calls.map(([leg]) => [leg.kind,leg.load,leg.range])).toEqual([['miner-approach',0,0],['miner-return',50,0],['courier-approach',0,0],['courier-empty',0,0],['courier-loaded',100,0]]);
  expect(f.measure.mock.calls.slice(0,2).every(([leg]) => leg.blocked === undefined)).toBe(true);
  expect(f.measure.mock.calls.slice(2).every(([leg]) => JSON.stringify(leg.blocked) === JSON.stringify([f.plan.station]))).toBe(true);
  expect(f.measure.mock.calls[0]![0].origin).toEqual(f.plan.spawn.exit);
  expect(f.measure.mock.calls[3]![0].origin).toEqual(f.plan.endpoint.deposit);
  expect(f.measure.mock.calls[4]![0].origin).toEqual(f.plan.collection);
});
test('completed legs survive JSON memory roundtrip and a new service without remeasuring earlier work',() => {
  const f = fixture(); expect(f.advance(f.plan,'topology',1,2,() => true)).toMatchObject({ status: 'deferred',reason: 'leg-budget',completedLegs: 2 });
  const memory = JSON.parse(JSON.stringify(f.root)), state = createMemoryPort(() => memory), measure = vi.fn(measured);
  const resumed = createStartupTravel(state,f.plan.home,measure);
  expect(resumed(f.plan,'topology',2,5,() => true).status).toBe('complete');
  expect(measure.mock.calls.map(([leg]) => leg.kind)).toEqual(['courier-approach','courier-empty','courier-loaded']);
  measure.mockClear(); expect(resumed(f.plan,'topology',3,0,() => true).status).toBe('complete'); expect(measure).not.toHaveBeenCalled();
  expect(resumed(f.plan,'topology',3,0,() => false)).toMatchObject({ status: 'deferred',reason: 'admission' });
});
test('topology/policy binding and geometry/body changes discard geometric progress',() => {
  const f = fixture(); f.advance(f.plan,'before',1,2,() => true); f.measure.mockClear();
  expect(f.advance(f.plan,'after',2,1,() => true)).toMatchObject({ completedLegs: 1 }); expect(f.measure.mock.calls[0]![0].kind).toBe('miner-approach');
  f.plan.spawn.exit.y--; expect(f.advance(f.plan,'after',3,1,() => true)).toMatchObject({ completedLegs: 1 });
  f.plan.courier = ['carry','move']; expect(f.advance(f.plan,'after',4,1,() => true)).toMatchObject({ completedLegs: 1 });
  expect(f.measure.mock.calls.every(([leg]) => leg.kind === 'miner-approach')).toBe(true);
});
test('guard and incomplete path results cannot publish a partial candidate as complete or mutate unrelated state',() => {
  const f = fixture(); f.state.write('fixture/sentinel',{ owner: 'fixture',version: 1,data: { retained: 42 } }); const before = JSON.stringify(f.root);
  expect(f.advance(f.plan,'topology',1,5,() => false)).toMatchObject({ status: 'deferred',completedLegs: 0 }); expect(JSON.stringify(f.root)).toBe(before);
  const service = createStartupTravel(f.state,f.plan.home,() => ({ status: 'deferred',reason: 'path-incomplete' }));
  expect(service(f.plan,'topology',1,5,() => true)).toMatchObject({ status: 'deferred',reason: 'path-incomplete',completedLegs: 0 }); expect(JSON.stringify(f.root)).toBe(before);
});
test('a later candidate or clock cannot be overwritten by an earlier observer or a concurrent progress writer',() => {
  const f = fixture(); f.advance(f.plan,'topology',2,1,() => true); const before = JSON.stringify(f.root);
  expect(f.advance(f.plan,'other',1,5,() => true)).toMatchObject({ status: 'deferred',reason: 'clock' }); expect(JSON.stringify(f.root)).toBe(before);
  const store = createStartupTravelProgress(f.state,f.plan.home);
  const service = createStartupTravel(f.state,f.plan.home,request => { const current = store.read(); store.save(current.revision,3,'other',[]); return measured(request); });
  expect(service(f.plan,'topology',3,1,() => true)).toMatchObject({ status: 'deferred',reason: 'progress-conflict',completedLegs: 1 });
  expect(store.read()).toMatchObject({ identity: 'other',legs: [] });
});
test('unsupported bodies, wrong service geometry and invalid work budgets fail before persistent progress',() => {
  const f = fixture(); expect(() => f.advance(f.plan,'topology',1,6,() => true)).toThrow('budget');
  f.plan.collection = { ...f.plan.station }; expect(() => startupTravelLegs(f.plan)).toThrow('adjacency');
  f.plan.collection.x--; f.plan.courier = ['work','carry','move']; expect(() => startupTravelLegs(f.plan)).toThrow('body');
  expect(JSON.stringify(f.root)).toBe('{}');
});
test('invalid measurement endpoints and negative cost cannot enter the cache',() => {
  const f = fixture();
  const bad = createStartupTravel(f.state,f.plan.home,request => ({ ...measured(request),ticks: -1 }));
  expect(() => bad(f.plan,'topology',1,5,() => true)).toThrow('measurement');
  const near = createStartupTravel(f.state,f.plan.home,request => ({ ...measured(request),arrival: { ...request.destination,x: request.destination.x+1 } }));
  expect(() => near(f.plan,'topology',1,5,() => true)).toThrow('measurement'); expect(JSON.stringify(f.root)).toBe('{}');
});
test('validly shaped but wrong cached arrivals are revalidated against exact requested destinations',() => {
  const f = fixture(), first = f.advance(f.plan,'topology',1,5,() => true); expect(first.status).toBe('complete'); if (first.status !== 'complete') return;
  const store = createStartupTravelProgress(f.state,f.plan.home), current = store.read(); current.legs[0]!.arrival.x++;
  store.save(current.revision,2,current.identity,current.legs);
  expect(() => f.advance(f.plan,'topology',2,5,() => true)).toThrow('measurement');
});
test('the detached request cannot be changed while a measurement is running',() => {
  const f = fixture(); const service = createStartupTravel(f.state,f.plan.home,request => { f.plan.station.x = 7; return measured(request); });
  const result = service(f.plan,'topology',1,5,() => true); expect(result.status).toBe('complete'); if (result.status !== 'complete') return;
  expect(result.plan.station.x).toBe(5); expect(result.legs[0]!.arrival.x).toBe(5);
});

test('measured path geometry is copied, persisted and revalidated after JSON reload',() => {
  const f = fixture();
  const path = [47,48,49].map(x => ({ room: 'W0N1',x,y: 24 }));
  path.push(...[0,1,2,3,4,5].map(x => ({ room: 'E0N1',x,y: 24 })));
  const advance = createStartupTravel(f.state,f.plan.home,request => ({ ...measured(request),path }));
  expect(advance(f.plan,'geometry',1,1,() => true)).toMatchObject({ completedLegs: 1 });
  path[0]!.x = 10;
  const restored = createMemoryPort(() => JSON.parse(JSON.stringify(f.root)));
  const retained = createStartupTravelProgress(restored,f.plan.home).read().legs[0]!;
  expect(retained.path?.[0]?.x).toBe(47);
  const resumed = createStartupTravel(restored,f.plan.home,measured);
  expect(resumed(f.plan,'geometry',2,0,() => true)).toMatchObject({ completedLegs: 1 });
  const invalid = createStartupTravel(f.state,f.plan.home,request => ({ ...measured(request),path }));
  expect(() => invalid(f.plan,'changed-geometry',3,1,() => true)).toThrow('path');
});
