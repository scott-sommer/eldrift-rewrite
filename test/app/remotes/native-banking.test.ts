import { afterEach, expect, test, vi } from 'vitest';
import { createNativeRemoteMiningCycle } from '../../../src/app/remotes/native-mining-cycle';
import { createNativeRemoteBanking } from '../../../src/app/remotes/native-banking';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { createIntelStore } from '../../../src/features/intel/store';
import { createActionArbiter } from '../../../src/core/execution/action-arbiter';
import { createTransferJournal } from '../../../src/features/logistics/transfer-journal';
import { createReservations } from '../../../src/persistence/reservations/store';
import { createLogisticsRequests } from '../../../src/features/logistics/request-store';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import { openState, saveState } from '../../../src/persistence/versioned-state';
import { taskSchema } from '../../../src/persistence/tasks/schema';
import { createTaskRunner, taskScope } from '../../../src/app/task-runner';
import type { createNativeDispatch } from '../../../src/app/native-dispatch';
import { intelSummary } from '../../fixtures/intel-summary';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const root = {}, state = createMemoryPort(() => root);
  createIntelStore(state).observeSummary({ ...intelSummary(10,'W0N1'),structures: [],units: [] });
  const home = { controller: { my: true },find: vi.fn((): AnyStructure[] => []) };
  vi.stubGlobal('Game',{ time: 10,rooms: { W0N1: home },map: { getRoomStatus: () => ({ status: 'normal' }),findRoute: () => [] } });
  vi.stubGlobal('FIND_STRUCTURES',1); vi.stubGlobal('ERR_NO_PATH',-2);
  const creep = { id: 'unit',name: 'worker',my: true,spawning: false,memory: { population: { home: 'W0N1',owner: 'mine' } },
    pos: { roomName: 'W0N1',x: 25,y: 25 },store: { energy: 20,getUsedCapacity: (resource?: string) => !resource || resource === 'energy' ? 20 : 0 } } as unknown as Creep;
  const dispatch = { arbiter: createActionArbiter(() => 10),movement: { move: vi.fn(() => ({ status: 'running' })) },activate: vi.fn() } as unknown as ReturnType<typeof createNativeDispatch>;
  const guard = vi.fn(() => true);
  const options = { maximumRooms: 8,guard,
    policy: (_home: string,username: string) => ({ mode: 'known-safe' as const,username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,
      maximumAge: 20,maximumRooms: 16,unknownCost: 8,staleCost: 4,keeperCost: 25 }) };
  const bank = createNativeRemoteBanking(state,dispatch,'W0N1',options);
  Object.assign(creep,{ owner: { username: 'bot' } });
  const definitions = { ...bank.definitions,'remote-mine': { phases: ['work'],validPayload: () => true },other: { phases: ['work'],validPayload: () => true } };
  const schema = taskSchema(creep.name,definitions);
  function enqueue(kind: string) {
    const tasks = openState(state,'tasks/worker',schema);
    tasks.queue.push({ id: 'existing',kind,phase: 'work',payload: null,wakeAt: 0,retries: 0,expiresAt: 100 });
    saveState(state,'tasks/worker',schema,tasks);
  }
  return { root,state,home,creep,bank,guard,definitions,schema,enqueue,dispatch,options };
}
test('cargo at a room border or on a foreign-home actor cannot trigger banking mutation', () => {
  const f = fixture(), before = JSON.stringify(f.root);
  f.creep.pos.x = 49; expect(f.bank.prepare(f.creep,f.definitions)).toBe('service');
  f.creep.memory.population!.home = 'E0N1'; expect(f.bank.prepare(f.creep,f.definitions)).toBe('hold');
  expect(JSON.stringify(f.root)).toBe(before);
});
test('unrelated work is preserved and explicitly interruptible remote work releases only its own scope', () => {
  const f = fixture(); f.enqueue('other'); const before = JSON.stringify(f.root);
  expect(f.bank.prepare(f.creep,f.definitions,['remote-mine'])).toBe('service'); expect(JSON.stringify(f.root)).toBe(before);
  const tasks = openState(f.state,'tasks/worker',f.schema); tasks.queue[0]!.kind = 'remote-mine'; saveState(f.state,'tasks/worker',f.schema,tasks);
  const claims = createReservations(f.state);
  claims.acquire({ resource: 'tile',holder: 'worker',scope: taskScope('worker','existing'),expiresAt: 100 },10);
  claims.acquire({ resource: 'unrelated',holder: 'other',scope: 'other',expiresAt: 100 },10);
  expect(f.bank.prepare(f.creep,f.definitions,['remote-mine'])).toBe('hold');
  expect(openState(f.state,'tasks/worker',f.schema).queue).toEqual([]);
  expect(claims.held('other',10).map(claim => claim.resource)).toEqual(['unrelated']);
  expect(claims.held(taskScope('worker','existing'),10)).toEqual([]);
});
test('a pending orphan journal cannot be treated as permission for a new delivery', () => {
  const f = fixture();
  createTransferJournal(f.state,'unit').begin({ id: 'prior',unit: 'unit',target: 'sink',room: 'W0N1',resource: 'energy',kind: 'transfer',tick: 9,amount: 20,cargoBefore: 20 });
  const before = JSON.stringify(f.root);
  expect(f.bank.prepare(f.creep,f.definitions)).toBe('hold'); expect(JSON.stringify(f.root)).toBe(before);
});
test('home loss or CPU denial cannot cancel a remote task or schedule a banking request', () => {
  const f = fixture(); f.enqueue('remote-mine'); const before = JSON.stringify(f.root);
  f.home.controller.my = false; expect(f.bank.prepare(f.creep,f.definitions,['remote-mine'])).toBe('hold');
  f.home.controller.my = true; f.guard.mockReturnValue(false);
  expect(f.bank.prepare(f.creep,f.definitions,['remote-mine'])).toBe('hold'); expect(JSON.stringify(f.root)).toBe(before);
});
test('a known bank task cancels its request after home ownership is lost without invoking native transfer', () => {
  const f = fixture(), request = { id: 'bank',owner: logisticsPool('cargo-recovery','W0N1'),source: 'unit',sink: 'sink',resource: 'energy',quantity: 20,priority: -1,expiresAt: 100 };
  createLogisticsRequests(f.state,'W0N1').submit(request,10);
  const tasks = openState(f.state,'tasks/worker',f.schema);
  tasks.queue.push({ id: 'bank',kind: 'haul',phase: 'work',payload: { home: 'W0N1',unitId: 'unit',sinkRoom: 'W0N1',request },wakeAt: 0,retries: 0,expiresAt: 100 });
  saveState(f.state,'tasks/worker',f.schema,tasks); f.home.controller.my = false;
  expect(f.bank.prepare(f.creep,f.definitions)).toBe('bank');
  expect(createTaskRunner(f.state,f.bank.definitions,() => 10,f.definitions)('worker',f.creep)).toMatchObject({ status: 'failed',reason: 'banking-home-lost' });
  expect(createLogisticsRequests(f.state,'W0N1').pending(10)).toEqual([]);
  expect(openState(f.state,'tasks/worker',f.schema).queue).toEqual([]);
});

test('remote actor ownership is checked before reading or changing another role’s task state', () => {
  const f = fixture();
  const cycle = createNativeRemoteMiningCycle(f.state,f.dispatch,{ home: 'W0N1',owner: 'remote-mine' },f.options,f.definitions);
  const read = vi.spyOn(f.state,'read'), before = JSON.stringify(f.root);
  cycle.run(f.creep);
  expect(read).not.toHaveBeenCalled(); expect(JSON.stringify(f.root)).toBe(before);
});

test('resource and sink policies can withhold banking without spending stock or reserving capacity', () => {
  const f = fixture(), acceptsResource = vi.fn<(resource: ResourceConstant) => boolean>(() => false);
  const filtered = createNativeRemoteBanking(f.state,f.dispatch,'W0N1',f.options,{ terminalReserve: 100,acceptsResource });
  expect(filtered.prepare(f.creep,f.definitions)).toBe('hold'); expect(acceptsResource.mock.calls.map(call => call[0])).toContain('energy');
  expect(f.home.find).not.toHaveBeenCalled();
  f.home.find.mockReturnValue([{ id: 'storage',structureType: 'storage',my: true,isActive: () => true,
    store: { getFreeCapacity: () => 1000 } } as unknown as AnyStructure]);
  const blocked = createNativeRemoteBanking(f.state,f.dispatch,'W0N1',f.options,{ terminalReserve: 100,acceptsSink: () => false });
  expect(blocked.prepare(f.creep,f.definitions)).toBe('hold');
  expect(f.state.read('quantity-reservations/empire')).toBeUndefined();
  expect(() => createNativeRemoteBanking(f.state,f.dispatch,'W0N1',f.options,{ terminalReserve: -1 })).toThrow('terminal reserve');
});
