import type { NativeMotionQuote } from '../../../src/app/remotes/startup/projection/motion/model';
import { afterEach,expect,test,vi } from 'vitest';
import { startupProjectionFixture } from '../../fixtures/native-startup-projection';
import { startupTravelLegs } from '../../../src/features/remotes/startup/travel-plan';
import { movementTransition } from '../../../src/capabilities/movement/transition';
import { plannedMobility } from '../../../src/capabilities/movement/planned-mobility';
import { pathTravelClock } from '../../../src/adapters/screeps/path-travel-clock';
import { compileStartupMotionGeometry } from '../../../src/app/remotes/startup/projection/motion/compile';
import { createNativeStartupMotionGeometry } from '../../../src/app/remotes/startup/projection/motion/native';
import type { Position } from '../../../src/capabilities/movement/step';
const controls = vi.hoisted(() => ({ topology: 'topology',blocked: false }));
vi.mock('../../../src/app/remotes/assessment/matrices',() => ({ prepareRemoteMatrices: () => ({ version: controls.topology,matrix: () => ({ get: () => controls.blocked ? 255 : 0 }) }) }));
afterEach(() => { vi.unstubAllGlobals(); controls.topology = 'topology'; controls.blocked = false; });
function path(origin: Position,target: Position): Position[] {
  let current = origin; const result: Position[] = [];
  while (current.room !== target.room) {
    current = movementTransition(current,current.room === 'W0N1' ? 3 : 7)!.landing; result.push(current);
  }
  const offsets = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]];
  while (current.x !== target.x || current.y !== target.y) {
    const dx = Math.sign(target.x-current.x),dy = Math.sign(target.y-current.y);
    const direction = offsets.findIndex(([x,y]) => x === dx && y === dy)+1;
    current = movementTransition(current,direction)!.landing; result.push(current);
  }
  return result;
}
function fixture() {
  const f = startupProjectionFixture();
  const quote: NativeMotionQuote = { ...f.quote,rooms: [f.quote.plan.home,f.quote.plan.room] };
  quote.identity = JSON.stringify([quote.plan,JSON.stringify(['startup-fixed-service-v3','topology'])]);
  quote.legs = startupTravelLegs(quote.plan).map(request => {
    const points = path(request.origin,request.destination);
    return { kind: request.kind,path: points,arrival: request.destination,operations: 1,ticks: pathTravelClock(request.origin,points,plannedMobility(request.body,request.load),() => 2)! };
  });
  vi.stubGlobal('Game',{ ...Game,map: { getRoomTerrain: () => ({ get: () => 0 }) } }); vi.stubGlobal('TERRAIN_MASK_SWAMP',2);
  return { ...f,quote,environment: { topology: 'topology',rate: () => 2 as const } };
}
test('native geometry compiles isolated normalized routes, native exit terrain and planned-name ordering',() => {
  const f = fixture(),result = createNativeStartupMotionGeometry(f.state)(f.quote,f.options.births);
  expect(result.status).toBe('ready'); if (result.status !== 'ready') return;
  expect(result.geometry.routes).toHaveLength(1); expect(result.geometry.terrain.length).toBeGreaterThan(0);
  expect(result.geometry.routes[0]!.approach.order).toBe(f.options.births[1]!.request.name);
  const original = f.quote.legs[2]!.path![0]!.x;
  result.geometry.routes[0]!.approach.path[0]!.x = 7;
  expect(f.quote.legs[2]!.path![0]!.x).toBe(original);
});
test('changed topology, missing geometry, mismatched timing and body refuse',() => {
  const f = fixture(),run = () => compileStartupMotionGeometry(f.quote,f.options.births,f.environment,() => true);
  f.environment.topology = 'changed'; expect(run()).toMatchObject({ reason: 'motion-topology' }); f.environment.topology = 'topology';
  f.quote.legs[0]!.ticks++; expect(run()).toMatchObject({ reason: 'motion-clock' }); f.quote.legs[0]!.ticks--;
  f.options.births[1]!.request.body = ['carry','move']; expect(run()).toMatchObject({ reason: 'motion-body' });
  delete f.quote.legs[2]!.path; expect(run()).toMatchObject({ reason: 'motion-path' });
});
test('freshness, live blocked tiles and budget cannot borrow earlier geometry',() => {
  const f = fixture(),read = createNativeStartupMotionGeometry(f.state);
  expect(read(f.quote,f.options.births,() => false)).toMatchObject({ reason: 'budget' });
  controls.blocked = true; expect(read(f.quote,f.options.births)).toMatchObject({ reason: 'motion-path' }); controls.blocked = false;
  Game.time = 2; expect(read(f.quote,f.options.births)).toMatchObject({ reason: 'stale-observation' });
});

test('budget exhaustion inside a measured path returns no partial published geometry',() => {
  const f = fixture(); let calls = 0;
  const result = compileStartupMotionGeometry(f.quote,f.options.births,f.environment,() => ++calls < 3);
  expect(result).toEqual({ status: 'deferred',reason: 'budget' });
  expect(compileStartupMotionGeometry(f.quote,f.options.births,f.environment,() => true).status).toBe('ready');
});
