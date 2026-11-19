import { afterEach, expect, test, vi } from 'vitest';
import { infrastructureFixture } from '../../fixtures/remote-infrastructure';
import { createNativeRemoteInfrastructureWork } from '../../../src/app/remotes/infrastructure/work-service';
import { nativeRemoteRoute } from '../../../src/app/remotes/native-route';
import { createActionArbiter } from '../../../src/core/execution/action-arbiter';
import type { createNativeDispatch } from '../../../src/app/native-dispatch';
import type { NativeRemoteOptions } from '../../../src/app/remotes/native-movement';
vi.mock('../../../src/app/remotes/native-route',() => ({ nativeRemoteRoute: vi.fn() }));
vi.mock('../../../src/app/remotes/native-observations',() => ({ createRemoteObservationRefresh: () => vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
function fixture() {
  const f = infrastructureFixture(); f.store.save(0,f.demand,f.draft,1);
  const site = { id: 'road',my: true,structureType: 'road',pos: { roomName: 'E0N1',x: 1,y: 25 },progress: 0,progressTotal: 300 };
  const rooms = { W0N1: { controller: { my: true,owner: { username: 'self' } } },E0N1: { controller: { reservation: undefined as { username: string } | undefined } } };
  vi.stubGlobal('WORK','work'); vi.stubGlobal('Game',{ time: 2,rooms,constructionSites: { road: site },getObjectById: () => site });
  const build = vi.fn(() => 0), move = vi.fn(() => ({ status: 'running' as const })), activate = vi.fn();
  const creep = { name: 'remote-builder',owner: { username: 'self' },pos: { roomName: 'W0N1',x: 47,y: 25 },store: { energy: 50 },getActiveBodyparts: () => 1,build } as unknown as Creep;
  const dispatch = { arbiter: createActionArbiter(() => Game.time),movement: { move },activate } as unknown as ReturnType<typeof createNativeDispatch>;
  const policy = { version: 'safe',allowedRooms: ['W0N1','E0N1'],blockedRooms: [],costs: {},maximumRooms: 2 };
  vi.mocked(nativeRemoteRoute).mockReturnValue(policy);
  let admitted = true;
  const options: NativeRemoteOptions = { maximumRooms: 2,guard: () => admitted,policy: (_home,username) => ({ mode: 'known-safe',username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,maximumAge: 100,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 }) };
  return { ...f,site,rooms,creep,build,move,activate,policy,service: createNativeRemoteInfrastructureWork(f.state,dispatch,options),pause: () => { admitted = false; } };
}
test('live outpost sites use shared admitted movement, then shared native build execution',() => {
  const f = fixture(), view = f.service.select(f.creep,f.demand)!;
  expect(view.order.id).toBe('road'); f.service.run(f.creep,f.demand,view.order,'road-task');
  expect(f.move).toHaveBeenCalledWith(f.creep,expect.objectContaining({ policy: f.policy,owner: 'road-task' })); expect(f.build).not.toHaveBeenCalled();
  f.creep.pos.roomName = 'E0N1'; f.creep.pos.x = 1;
  expect(f.service.run(f.creep,f.demand,view.order,'road-task').status).toBe('running'); expect(f.build).toHaveBeenCalledWith(f.site);
});
test('lease withdrawal between selection and an in-range action forbids construction',() => {
  const f = fixture(), view = f.service.select(f.creep,f.demand)!;
  f.creep.pos.roomName = 'E0N1'; f.creep.pos.x = 1;
  f.assignments.reconcile({ home: 'W0N1',tick: 2,lifetime: 50,expectedRevision: 1,plans: [] });
  expect(f.service.run(f.creep,f.demand,view.order,'road-task')).toMatchObject({ status: 'blocked',reason: 'work-authority-unavailable' });
  expect(f.build).not.toHaveBeenCalled(); expect(f.move).not.toHaveBeenCalled();
});
test('route denial, foreign reservation, home loss and budget denial do not turn retained plans into work',() => {
  const f = fixture(); vi.mocked(nativeRemoteRoute).mockReturnValueOnce(undefined); expect(f.service.select(f.creep,f.demand)).toBeUndefined();
  f.rooms.E0N1.controller.reservation = { username: 'foreign' }; expect(f.service.select(f.creep,f.demand)).toBeUndefined();
  f.rooms.E0N1.controller.reservation = undefined; f.rooms.W0N1.controller.my = false; expect(f.service.select(f.creep,f.demand)).toBeUndefined();
  f.rooms.W0N1.controller.my = true; f.pause(); expect(f.service.select(f.creep,f.demand)).toBeUndefined();
  expect(f.build).not.toHaveBeenCalled(); expect(f.move).not.toHaveBeenCalled();
});
test('changed sites and forged orders are rechecked at execution',() => {
  const f = fixture(), view = f.service.select(f.creep,f.demand)!;
  f.creep.pos.roomName = 'E0N1'; f.creep.pos.x = 1;
  expect(f.service.run(f.creep,f.demand,{ ...view.order,kind: 'upgrade' },'road-task').status).toBe('blocked');
  f.site.progress = 300; expect(f.service.run(f.creep,f.demand,view.order,'road-task').status).toBe('blocked');
  expect(f.build).not.toHaveBeenCalled();
});
