import { expect,test } from 'vitest';
import { paidRouteFixture } from '../../fixtures/paid-route';
import { createPaidHaulingMovement } from '../../../src/app/remotes/startup/hauling-state/movement/frame';
import { activatePaidCourierRoute } from '../../../src/features/remotes/startup/routes/progress';
import { createActionArbiter } from '../../../src/core/execution/action-arbiter';
import type { PaidMovementCheckpoint } from '../../../src/app/remotes/startup/hauling-state/movement/model';
const empty = () => ({ plans: [],states: [],requestedUnits: [],occupants: [] });
function fixture() {
  const f = paidRouteFixture(); f.program.retireAt = 101; f.program.expiresAt = 140;
  const initial = [activatePaidCourierRoute(f.program)]; let tick = 100;
  const ports = { legal: () => true,terrain: (position: { x: number }) => position.x === 12 ? 10 as const : 2 as const };
  const create = (checkpoint?: PaidMovementCheckpoint) => createPaidHaulingMovement('W0N1',100,initial,createActionArbiter(() => tick),ports,checkpoint);
  const movement = create();
  const observation = (x: number,fatigue = 0,energy = 32) => ({ tick,name: 'paid-courier',unit: 'native-id',position: f.point(x),fatigue,energy,
    phase: energy ? 'deliver' as const : 'collect' as const,readyAt: tick });
  const command = (x = 10) => ({ owner: 'recovery-task',destination: f.point(x),range: 0,policy: { blockedRooms: [],allowedRooms: ['W0N1'] } });
  movement.begin(100,[observation(14)]); movement.finish(empty()); tick = 101;
  movement.begin(101,[observation(14)]);
  expect(movement.request('paid-courier',command())).toMatchObject({ reason: 'productive-route-retired' });
  movement.recover('paid-courier',command(),[13,12,11,10].map(f.point));
  expect(movement.finish({ ...empty(),occupants: [{ unit: 'resident',position: f.point(13) }] }).resolution.denied).toHaveLength(1);
  return { ...f,movement,create,observation,command,at(value: number) { tick = value; } };
}

test('retirement holds actual occupancy, then resumes a contended recovery path and reroutes to another sink with physical fatigue',() => {
  const f = fixture(),checkpoint = JSON.parse(JSON.stringify(f.movement.checkpoint())),resumed = f.create(checkpoint);
  let x = 14,fatigue = 0,swamp = false,arrived = false;
  for (let tick = 102; tick <= 122; tick++) {
    f.at(tick); const value = f.observation(x,fatigue,x === 9 ? 0 : 32),results = [];
    for (const movement of [f.movement,resumed]) {
      movement.begin(tick,[value]);
      const command = f.command(tick === 102 ? 10 : 9),path = tick === 103 ? [12,11,10,9].map(f.point) : undefined;
      movement.recover('paid-courier',command,path);
      results.push(movement.finish(empty()));
    }
    expect(results[1]).toEqual(results[0]); expect(resumed.checkpoint()).toEqual(f.movement.checkpoint());
    const state = results[0]!.states[0]!; x = state.position.x; fatigue = state.fatigue;
    if (x === 12 && fatigue === 8) swamp = true;
    if (x === 9) arrived = true;
  }
  expect(swamp).toBe(true); expect(arrived).toBe(true);
  expect(f.movement.checkpoint().retirements![0]).toMatchObject({ energy: 0,cursor: { position: f.point(9) } });
});

test('retirement restore rejects changed native identity, mobility, lifespan and expected physical continuation',() => {
  const f = fixture(),checkpoint = f.movement.checkpoint();
  for (const field of ['unit','recovery','expiry','cursor','duplicate']) {
    const bad = structuredClone(checkpoint),route = bad.retirements![0]!;
    if (field === 'unit') route.unit = 'another-body';
    if (field === 'recovery') route.plan.recovery++;
    if (field === 'expiry') route.expiresAt++;
    if (field === 'cursor') route.cursor.position.x++;
    if (field === 'duplicate') bad.retirements!.push(structuredClone(route));
    expect(() => f.create(bad),field).toThrow();
  }
  const resumed = f.create(checkpoint); f.at(102);
  expect(() => resumed.begin(102,[f.observation(13)])).toThrow('physical deviation');
});

test('recovery respects room policy, one movement per body and the natural lifetime boundary',() => {
  const f = fixture(); f.at(102); f.movement.begin(102,[f.observation(14)]);
  expect(f.movement.resume('paid-courier')).toBe(false);
  expect(f.movement.recover('paid-courier',{ ...f.command(),policy: { blockedRooms: ['W0N1'] } })).toMatchObject({ reason: 'planned-movement-room-policy' });
  expect(f.movement.recover('paid-courier',f.command())).toMatchObject({ reason: 'movement-already-requested' });
  expect(f.movement.finish(empty()).states[0]!.position.x).toBe(14);
  for (let tick = 103; tick < 140; tick++) { f.at(tick); f.movement.begin(tick,[f.observation(14)]); f.movement.finish(empty()); }
  f.at(140); expect(() => f.movement.begin(140,[f.observation(14)])).toThrow('Retirement observation binding');
});
