import { transportService } from '../../../src/app/remotes/transport-service';
import { afterEach, expect, test, vi } from 'vitest';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { createIntelStore } from '../../../src/features/intel/store';
import { createRemoteAssignmentStore } from '../../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../../src/features/remotes/assignment-demand';
import { createNativeRemoteTransportContext } from '../../../src/app/remotes/native-transport-context';
import { createNativeRemoteTransportCycle } from '../../../src/app/remotes/native-transport-cycle';
import type { createNativeDispatch } from '../../../src/app/native-dispatch';
import { intelSummary } from '../../fixtures/intel-summary';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const root = {}, state = createMemoryPort(() => root), store = createRemoteAssignmentStore(state), intel = createIntelStore(state);
  for (const room of ['W0N1','E0N1']) intel.observeSummary({ ...intelSummary(10,room),structures: [],units: [],controller: null });
  store.reconcile({ home: 'W0N1',tick: 10,lifetime: 100,expectedRevision: 0,plans: [{ room: 'E0N1',sources: ['source'],reserve: null,infrastructure: null }] });
  const demand = remoteAssignmentDemands(store.read().assignments[0]!,10)[0]!;
  if (demand.kind !== 'mine') throw new Error('Expected mine');
  const container = (id: string,energy: number) => ({ id,structureType: 'container',pos: { roomName: 'E0N1',x: 9,y: 10 },store: { energy } });
  const first = container('first',10), second = container('second',100);
  vi.stubGlobal('STRUCTURE_CONTAINER','container'); vi.stubGlobal('FIND_STRUCTURES',1); vi.stubGlobal('FIND_DROPPED_RESOURCES',2); vi.stubGlobal('RESOURCE_ENERGY','energy'); vi.stubGlobal('ERR_NO_PATH',-2);
  vi.stubGlobal('Game',{ time: 10,rooms: { W0N1: { controller: { my: true } },E0N1: { find: (kind: number) => kind === 1 ? [first,second] : [] } },
    getObjectById: (id: string) => id === 'first' ? first : second,
    map: { getRoomStatus: () => ({ status: 'normal' }),findRoute: (origin: string,target: string) => origin === target ? [] : [{ room: target,exit: 3 }] } });
  const dispatch = { activate: vi.fn(),movement: { move: vi.fn() } } as unknown as ReturnType<typeof createNativeDispatch>;
  const options = { maximumRooms: 8,minimumBatch: 10,requestLifetime: 50,guard: () => true,
    policy: (_home: string,username: string) => ({ mode: 'known-safe' as const,username,allies: [],blockedRooms: [],avoidUntil: {},allowKeeper: false,
      maximumAge: 20,maximumRooms: 64,unknownCost: 8,staleCost: 4,keeperCost: 25 }) };
  const binding = { home: 'W0N1',owner: 'hauler' };
  const creep = { my: true,spawning: false,memory: { population: { home: 'W0N1',owner: 'other' } },owner: { username: 'bot' },pos: { roomName: 'W0N1' } } as Creep;
  return { root,state,dispatch,options,binding,creep,demand,first,second };
}
test('a trip retains its valid source container when another candidate ranks higher', () => {
  const f = fixture(), context = createNativeRemoteTransportContext(f.state,f.dispatch,f.binding,f.options);
  expect(context.source(f.creep,f.demand)?.endpoint?.id).toBe('second');
  const request = { id: 'trip',owner: context.owner(f.demand),source: 'first',sink: 'home',resource: 'energy',quantity: 10,priority: 0,expiresAt: 50 };
  expect(context.route(f.creep,request,'collect')?.allowedRooms).toEqual(['W0N1','E0N1']);
});
test('transport actor ownership is checked before task state reads', () => {
  const f = fixture(), cycle = createNativeRemoteTransportCycle(f.state,f.dispatch,f.binding,f.options);
  const read = vi.spyOn(f.state,'read'), before = JSON.stringify(f.root);
  cycle.run(f.creep,f.demand); expect(read).not.toHaveBeenCalled(); expect(JSON.stringify(f.root)).toBe(before);
});

test('selected transport uses only its quoted container and refuses changed request geometry or sink',() => {
  const f = fixture(); f.second.pos.x = 10; f.second.pos.y = 9;
  const service = { station: { room: 'E0N1',x: 9,y: 10 },collection: { room: 'E0N1',x: 8,y: 10 },deposit: { room: 'W0N1',x: 1,y: 1 },endpoint: 'home' };
  const context = createNativeRemoteTransportContext(f.state,f.dispatch,f.binding,{ ...f.options,service });
  expect(context.source(f.creep,f.demand)?.endpoint?.id).toBe('first');
  const request = { id: 'fixed-trip',owner: context.owner(f.demand),source: 'first',sink: 'home',resource: 'energy',quantity: 10,priority: 0,expiresAt: 50,service: transportService(service) };
  expect(context.route(f.creep,request,'collect')).toBeDefined();
  expect(context.authority({ ...request,sink: 'alternate' })).toBeUndefined();
  request.service.collection.x--; expect(context.authority(request)).toBeUndefined();
  f.first.pos.x = 8; expect(context.source(f.creep,f.demand)?.endpoint).toBeUndefined();
});
