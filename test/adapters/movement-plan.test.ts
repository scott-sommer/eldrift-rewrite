import { afterEach,expect,test,vi } from 'vitest';
import * as traffic from '../../src/adapters/screeps/movement-traffic';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { followNativeMovementPlan } from '../../src/adapters/screeps/movement-plan';
import { createTrafficDispatch } from '../../src/capabilities/movement/traffic/dispatch';
import { createTransitPlan } from '../../src/capabilities/movement/transit/plan';
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function fixture(blocked = false) {
  vi.stubGlobal('Game',{ time: 10 }); vi.stubGlobal('MOVE','move'); vi.stubGlobal('CARRY','carry'); vi.stubGlobal('CARRY_CAPACITY',50);
  const point = (x: number) => ({ room: 'W0N1',x,y: 25 });
  const creep = { id: 'native-id',name: 'planned-name',pos: { roomName: 'W0N1',x: 10,y: 25 },fatigue: 0,spawning: false,body: [{ type: 'carry',hits: 100 },{ type: 'move',hits: 100 }],store: { getUsedCapacity: () => 32 } } as unknown as Creep;
  const plan = createTransitPlan({ unit: 'request-id',order: 'planned-name',owner: 'paid-owner',priority: 0,weight: 1,recovery: 2,origin: point(10),path: [point(11),point(12)] });
  const issue = vi.fn(() => ({ status: 'issued' as const,code: 0 }));
  const dispatch = createTrafficDispatch({ clock: () => 10,observe: () => [{ unit: creep.id,position: point(10) },...(blocked ? [{ unit: 'miner',position: point(11) }] : [])],legal: () => true,issue },() => {});
  const command = { owner: 'task-scope',destination: point(12),range: 0,policy: { version: 'route',blockedRooms: [],costs: {},maximumRooms: 1 } };
  return { creep,plan,command,issue,dispatch };
}
test('fixed path queues actual native identity into the shared traffic batch and preserves name ordering',() => {
  const f = fixture(); expect(followNativeMovementPlan(f.creep,f.command,f.plan,0,f.dispatch.submit)).toEqual({ status: 'running' });
  expect(f.issue).not.toHaveBeenCalled(); f.dispatch.flush();
  expect(f.issue).toHaveBeenCalledWith(expect.objectContaining({ unit: 'native-id',order: 'planned-name',owner: 'task-scope',to: { room: 'W0N1',x: 11,y: 25 } }));
});
test('shared occupancy blocks a fixed plan and invalid cursor or fatigue never invokes a substitute search',() => {
  const f = fixture(true); followNativeMovementPlan(f.creep,f.command,f.plan,0,f.dispatch.submit); f.dispatch.flush(); expect(f.issue).not.toHaveBeenCalled();
  expect(followNativeMovementPlan(f.creep,f.command,f.plan,1,f.dispatch.submit)).toMatchObject({ reason: 'planned-movement-position' });
  Object.assign(f.command.policy,{ allowedRooms: ['E0N1'] });
  expect(followNativeMovementPlan(f.creep,f.command,f.plan,0,f.dispatch.submit)).toMatchObject({ reason: 'planned-movement-room-policy' });
  Object.assign(f.command.policy,{ allowedRooms: ['W0N1'] });
  f.creep.fatigue = 2;
  expect(followNativeMovementPlan(f.creep,f.command,f.plan,0,f.dispatch.submit)).toMatchObject({ reason: 'fatigue' });
  expect(f.issue).not.toHaveBeenCalled();
});

test('fixed and searched movement share one per-unit reservation',() => {
  const f = fixture(),movement = createMovementService();
  expect(movement.follow(f.creep,f.command,f.plan,0)).toMatchObject({ status: 'running' });
  expect(movement.move(f.creep,f.command)).toMatchObject({ reason: 'movement-already-requested' });
  expect(movement.follow(f.creep,f.command,f.plan,0)).toMatchObject({ reason: 'movement-already-requested' });
});

test('fixed native settlement never calls uninitialized navigator progress',() => {
  const f = fixture(),move = vi.fn(() => 0);
  Object.assign(f.creep,{ move }); Object.assign(Game,{ getObjectById: () => f.creep });
  vi.spyOn(traffic,'movementOccupants').mockReturnValue([{ unit: f.creep.id,position: f.plan.origin }]);
  vi.spyOn(traffic,'createMovementLegality').mockReturnValue(() => true);
  const movement = createMovementService(); movement.follow(f.creep,f.command,f.plan,0);
  expect(() => movement.flush()).not.toThrow(); expect(move).toHaveBeenCalledOnce();
  movement.flush(); expect(move).toHaveBeenCalledOnce();
});
