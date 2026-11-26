import { afterEach, expect, test, vi } from 'vitest';
import { startupFixture } from '../../fixtures/remote-startup';
import { createNativeRemoteServicePorts } from '../../../src/app/remotes/service-ports';
import { remoteAssignmentDemands } from '../../../src/features/remotes/assignment-demand';
import { remoteTransportOwner } from '../../../src/features/remotes/transport-authority';
import { validHaulingPayload } from '../../../src/app/hauling-task';
afterEach(() => vi.unstubAllGlobals());
function fixture() {
  vi.stubGlobal('MOVE','move');
  const f = startupFixture(), demand = remoteAssignmentDemands(f.assignments.read().assignments[0]!,1).find(demand => demand.kind === 'mine')!;
  if (demand.kind !== 'mine') throw new Error('Expected source demand');
  const creep = { id: 'courier-id',name: 'courier',my: true,spawning: false,memory: { population: { owner: f.courier.owner,home: 'W0N1' } },pos: { roomName: 'W0N1',x: 47,y: 24 },store: { energy: 56 },getActiveBodyparts: () => 1 };
  const sink = { id: 'bank',structureType: 'storage',my: true,pos: { roomName: 'W0N1',x: 45,y: 25 },isActive: () => true,store: { getFreeCapacity: () => 1000 } };
  const service = { collection: { room: 'E0N1',x: 4,y: 25 },deposit: { room: 'W0N1',x: 46,y: 25 } };
  const request = { id: 'trip',owner: remoteTransportOwner(demand,f.courier.owner),source: 'container',sink: 'bank',resource: 'energy',quantity: 56,priority: 0,expiresAt: 100,service };
  f.state.write('tasks/courier',{ owner: 'tasks',version: 2,data: { unit: 'courier',queue: [{ id: 'trip',kind: 'haul',phase: 'work',payload: { home: 'W0N1',unitId: creep.id,request },wakeAt: 1,retries: 0,expiresAt: 100 }] } });
  vi.stubGlobal('Game',{ time: 1,rooms: { W0N1: { controller: { my: true } } },creeps: { courier: creep },getObjectById: () => sink });
  const observe = createNativeRemoteServicePorts(f.state,{ haul: { phases: ['work'],validPayload: validHaulingPayload } });
  return { ...f,creep,sink,service,observe };
}
test('nearby loaded current remote task grants a detached transient port without writes',() => {
  const f = fixture(), before = JSON.stringify(f.root), ports = f.observe();
  expect(ports).toHaveLength(1); expect(ports[0]).toMatchObject({ position: f.service.deposit,allowed: ['courier'] });
  ports[0]!.position.x = 1; expect(f.observe()[0]!.position).toEqual(f.service.deposit); expect(JSON.stringify(f.root)).toBe(before);
});
test('empty or distant actors and withdrawn leases grant no port access',() => {
  const f = fixture(); f.creep.store.energy = 0; expect(f.observe()).toEqual([]);
  f.creep.store.energy = 56; f.creep.pos.x = 40; expect(f.observe()).toEqual([]); f.creep.pos.x = 47;
  f.sink.my = false; expect(f.observe()).toEqual([]); f.sink.my = true;
  f.assignments.reconcile({ home: 'W0N1',tick: 1,lifetime: 100,expectedRevision: f.assignments.read().revision,plans: [] }); expect(f.observe()).toEqual([]);
});
