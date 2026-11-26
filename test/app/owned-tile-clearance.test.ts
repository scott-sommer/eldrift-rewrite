import { afterEach, expect, test, vi } from 'vitest';
import { createOwnedTileClearance } from '../../src/app/owned-tile-clearance';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
vi.mock('../../src/adapters/screeps/service-position',() => ({ canStandAt: () => true }));
afterEach(() => vi.unstubAllGlobals());
test('permitted service user keeps its tile; an unrelated owned blocker yields through shared movement once',() => {
  const courier = { id: 'courier-id',name: 'courier',my: true,spawning: false,fatigue: 0,pos: { roomName: 'W0N1',x: 46,y: 25 },getActiveBodyparts: () => 1 };
  const blocker = { ...courier,id: 'blocker-id',name: 'blocker',pos: { roomName: 'W0N1',x: 47,y: 24 } };
  vi.stubGlobal('MOVE','move'); vi.stubGlobal('Game',{ time: 1,creeps: { courier,blocker },rooms: { W0N1: { name: 'W0N1' } } });
  const movement = { move: vi.fn(() => ({ status: 'running' as const })) }, arbiter = createActionArbiter(() => Game.time);
  const clear = createOwnedTileClearance(arbiter,movement,() => [{ owner: 'port',position: { room: 'W0N1',x: 46,y: 25 },allowed: ['courier'] }]);
  expect(clear()).toBe(false); expect(movement.move).not.toHaveBeenCalled();
  Game.time = 2; courier.pos.x = 47; blocker.pos.x = 46; blocker.pos.y = 25;
  expect(clear()).toBe(true); expect(clear()).toBe(false); expect(movement.move).toHaveBeenCalledTimes(1); expect(arbiter.claim('blocker','ordinary-role')).toBe(false);
});
