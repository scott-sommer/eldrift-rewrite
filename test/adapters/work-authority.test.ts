import { afterEach, expect, test, vi } from 'vitest';
import { createNativeWork } from '../../src/adapters/screeps/work-execution';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import type { RoutePolicy } from '../../src/capabilities/movement/room-route';
import type { WorkOrder } from '../../src/capabilities/work/assessment';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  vi.stubGlobal('Game',{ time: 1,rooms: { E0N1: {} },getObjectById: () => ({ id: 'road' }) });
  const build = vi.fn(() => 0), move = vi.fn(() => ({ status: 'running' as const }));
  const creep = { name: 'builder',pos: { roomName: 'W0N1',x: 48,y: 25 },store: { energy: 50 },build } as unknown as Creep;
  const order: WorkOrder = { id: 'road',kind: 'build',position: { room: 'E0N1',x: 4,y: 25 },priority: 10,score: 6 };
  const policy: RoutePolicy = { version: 'lease-7',allowedRooms: ['W0N1','E0N1'],blockedRooms: [],costs: {},maximumRooms: 2 };
  return { build,move,creep,order,policy,arbiter: createActionArbiter(() => Game.time) };
}
test('injected route reaches shared movement with task ownership; default route remains owned-work',() => {
  const f = fixture(), policyFor = vi.fn(() => f.policy);
  createNativeWork(f.arbiter,{ move: f.move },policyFor)(f.creep,f.order,'remote-task');
  expect(policyFor).toHaveBeenCalledWith(f.creep,f.order,'remote-task');
  expect(f.move).toHaveBeenCalledWith(f.creep,expect.objectContaining({ owner: 'remote-task',policy: f.policy }));
  expect(f.build).not.toHaveBeenCalled();
  f.move.mockClear(); createNativeWork(f.arbiter,{ move: f.move })(f.creep,f.order,'owned-task');
  expect(f.move).toHaveBeenCalledWith(f.creep,expect.objectContaining({ policy: expect.objectContaining({ version: 'owned-work' }) }));
});
test('revoked authority blocks in-range work without consuming shared action ownership',() => {
  const f = fixture(); let permitted = true;
  const work = createNativeWork(f.arbiter,{ move: f.move },() => permitted ? f.policy : undefined);
  work(f.creep,f.order,'remote-task'); permitted = false;
  f.creep.pos.roomName = 'E0N1'; f.creep.pos.x = 3;
  expect(work(f.creep,f.order,'remote-task')).toMatchObject({ status: 'blocked',reason: 'work-authority-unavailable' });
  expect(f.build).not.toHaveBeenCalled(); expect(f.move).toHaveBeenCalledTimes(1);
  permitted = true; expect(work(f.creep,f.order,'remote-task').status).toBe('running');
  expect(f.build).toHaveBeenCalledTimes(1);
});
