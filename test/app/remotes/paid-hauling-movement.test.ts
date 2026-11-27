import { expect,test } from 'vitest';
import { paidRouteFixture } from '../../fixtures/paid-route';
import { createPaidHaulingMovement } from '../../../src/app/remotes/startup/hauling-state/movement/frame';
import { activatePaidCourierRoute } from '../../../src/features/remotes/startup/routes/progress';
import type { PaidCourierRouteObservation } from '../../../src/features/remotes/startup/routes/model';
import { createActionArbiter } from '../../../src/core/execution/action-arbiter';
import { createTransitPlan,initialTransitState } from '../../../src/capabilities/movement/transit/plan';
const empty = () => ({ plans: [],states: [],requestedUnits: [],occupants: [] });
function fixture() {
  const f = paidRouteFixture(),route = activatePaidCourierRoute(f.program),before = JSON.stringify(route);
  let tick = 100;
  const arbiter = createActionArbiter(() => tick);
  const movement = createPaidHaulingMovement('W0N1',100,[route],arbiter,{ legal: () => true,terrain: () => 2 });
  const observation = (at = tick,x = 14,energy = 32,fatigue = 0): PaidCourierRouteObservation => ({ tick: at,name: 'paid-courier',unit: 'native-id',position: f.point(x),phase: energy ? 'deliver' : 'collect',readyAt: at,energy,fatigue });
  const command = { owner: 'task-owner',destination: f.point(10),range: 0,policy: { blockedRooms: [],allowedRooms: ['W0N1'] } };
  return { ...f,route,before,arbiter,movement,observation,command,at(value: number) { tick = value; } };
}

test('service requests translate planned names to native IDs/task owners and cursor progress waits for next-frame observation', () => {
  const f = fixture(); f.movement.begin(100,[f.observation()]);
  expect(f.movement.request('paid-courier',f.command)).toEqual({ status: 'running' });
  expect(f.movement.current('paid-courier')!.cursor).toMatchObject({ index: 0,requestedAt: 100 });
  const next = f.movement.finish(empty());
  expect(next.resolution.accepted[0]).toMatchObject({ unit: 'native-id',order: 'paid-courier',owner: 'task-owner' });
  expect(next.states[0]!.position.x).toBe(13);
  expect(f.movement.current('paid-courier')!.cursor!.index).toBe(0);
  f.at(101); f.movement.begin(101,[f.observation(101,13)]);
  expect(f.movement.current('paid-courier')!.cursor).toMatchObject({ index: 1,requestedAt: null });
  expect(JSON.stringify(f.route)).toBe(f.before);
});

test('an unrequested route stays still, while outside movers participate in the same dependency solver', () => {
  const f = fixture(); f.movement.begin(100,[f.observation()]);
  expect(f.movement.finish(empty()).states[0]!.position.x).toBe(14);
  f.at(101); f.movement.begin(101,[f.observation(101)]); f.movement.request('paid-courier',f.command);
  const plan = createTransitPlan({ unit: 'resident-id',order: 'resident',owner: 'resident-owner',priority: 0,origin: f.point(13),path: [f.point(12)],weight: 0,recovery: 2 });
  const next = f.movement.finish({ plans: [{ ...plan,order: 'resident' }],states: [initialTransitState(plan,101)],requestedUnits: ['resident-id'],occupants: [] });
  expect(next.states.map(state => state.position.x)).toEqual([13,12]);
});

test('stationary outside occupants block movement and denied traffic never advances its cursor', () => {
  const f = fixture(); f.movement.begin(100,[f.observation()]); f.movement.request('paid-courier',f.command);
  expect(f.movement.finish({ ...empty(),occupants: [{ unit: 'resident',position: f.point(13) }] }).resolution.denied).toEqual([{ unit: 'native-id',reason: 'dependency-blocked' }]);
  f.at(101); f.movement.begin(101,[f.observation(101)]);
  expect(f.movement.current('paid-courier')!.cursor!.index).toBe(0);
  expect(() => f.movement.begin(102,[f.observation(102)])).toThrow('frame order');
});

test('room policy and duplicate requests preserve native refusals; conflicting action ownership invalidates the forecast', () => {
  const blocked = fixture(); blocked.movement.begin(100,[blocked.observation()]);
  expect(blocked.movement.request('paid-courier',{ ...blocked.command,policy: { blockedRooms: ['W0N1'] } })).toMatchObject({ reason: 'planned-movement-room-policy' });
  expect(blocked.movement.finish(empty()).states[0]!.position.x).toBe(14);
  const f = fixture(); f.movement.begin(100,[f.observation()]); f.movement.request('paid-courier',f.command);
  expect(f.movement.request('paid-courier',f.command)).toMatchObject({ reason: 'movement-already-requested' });
  f.arbiter.claim('paid-courier','another-owner');
  expect(() => f.movement.finish(empty())).toThrow('action ownership');
  expect(() => f.movement.current('paid-courier')).toThrow('Cannot resume failed');
});

test('fatigue recovery and service phase changes use the same route program and wrong physical continuation refuses', () => {
  const f = fixture(); f.route.fatigue = 2;
  const movement = createPaidHaulingMovement('W0N1',100,[f.route],f.arbiter,{ legal: () => true,terrain: () => 2 });
  movement.begin(100,[f.observation(100,14,32,2)]); expect(movement.request('paid-courier',f.command)).toMatchObject({ reason: 'fatigue' });
  expect(movement.finish(empty()).states[0]!.fatigue).toBe(0);
  f.at(101); movement.begin(101,[f.observation(101)]); movement.request('paid-courier',f.command); movement.finish(empty());
  f.at(102); expect(() => movement.begin(102,[f.observation(102,14)])).toThrow('physical deviation');
  const service = fixture();
  service.program.opening.plan = { ...service.program.opening.plan,origin: service.point(10),path: [] };
  const atBank = createPaidHaulingMovement('W0N1',100,[activatePaidCourierRoute(service.program)],service.arbiter,{ legal: () => true,terrain: () => 2 });
  atBank.begin(100,[service.observation(100,10)]); atBank.finish(empty()); service.at(101);
  atBank.begin(101,[service.observation(101,10,0)]);
  expect(atBank.current('paid-courier')!).toMatchObject({ leg: 'empty',phase: 'collect',cursor: { index: 0 } });
});
