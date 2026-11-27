import { createLogisticsRequests } from '../../../src/features/logistics/request-store';
import { afterEach,expect,test,vi } from 'vitest';
import { startupFixture,startupPosition } from '../../fixtures/remote-startup';
import { startupTravelPlan } from '../../fixtures/startup-travel';
import { remoteAssignmentDemands } from '../../../src/features/remotes/assignment-demand';
import { remoteTransportOwner } from '../../../src/features/remotes/transport-authority';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import { createTransferJournal } from '../../../src/features/logistics/transfer-journal';
import { createNativePaidCourierObservation } from '../../../src/app/remotes/startup/motion-observation/native';
import type { PaidCourierContext } from '../../../src/app/remotes/startup/motion-observation/model';
afterEach(() => vi.unstubAllGlobals());
function fixture(withTask = true) {
  const f = startupFixture(); f.game.time = 10;
  const store = { energy: 0,getUsedCapacity(): number { return this.energy; } };
  const creep = { id: 'native-courier',name: 'courier',my: true,spawning: false,memory: { population: { home: 'W0N1',owner: f.courier.owner } },
    pos: startupPosition(4,24),body: f.courier.body.map(type => ({ type,hits: 100 })),store,fatigue: 0,ticksToLive: 1494 };
  f.game.creeps.courier = creep as unknown as Creep;
  const context: PaidCourierContext = { cohort: { home: 'W0N1',room: 'E0N1',source: 'source',generation: 1,endpoint: 'bank' },plan: startupTravelPlan(),
    paid: { request: 'courier',owner: f.courier.owner,body: [...f.courier.body],startAt: 1,activeAt: 5,expiresAt: 1504,retireAt: 1450,capacity: 100 } };
  const demand = remoteAssignmentDemands(f.assignments.read().assignments[0]!,10).find(demand => demand.kind === 'mine')!;
  const request = { id: 'trip',owner: remoteTransportOwner(demand,f.courier.owner),source: 'container',sink: 'bank',resource: 'energy',quantity: 100,priority: 0,expiresAt: 100,
    service: { collection: context.plan.collection,deposit: context.plan.endpoint.deposit,avoid: [context.plan.station] } };
  const record = { request,cancelled: false,receipts: [] as { id: string; amount: number }[] };
  if (withTask) {
    f.state.write('tasks/courier',{ owner: 'tasks',version: 2,data: { unit: 'courier',queue: [{ id: 'trip',kind: 'haul',phase: 'work',payload: { home: 'W0N1',unitId: creep.id,request },wakeAt: 10,retries: 0,expiresAt: 100 }] } });
    f.state.write('logistics-requests/W0N1',{ owner: 'logistics',version: 2,data: { records: [record] } });
  }
  const read = createNativePaidCourierObservation(f.state),journal = createTransferJournal(f.state,creep.id);
  function pending() { journal.begin({ id: 'attempt',requestKey: logisticsPool('request-binding','W0N1',request.owner,'trip'),unit: creep.id,target: 'container',room: 'E0N1',resource: 'energy',kind: 'withdraw',tick: 9,amount: 100,cargoBefore: 0 }); }
  return { ...f,creep,context,request,record,read,journal,pending };
}
test('actual cargo selects collect/deliver while reads and returned mutations cannot change owners',() => {
  const f = fixture(),before = JSON.stringify(f.root),first = f.read(f.context);
  expect(first).toMatchObject({ status: 'ready',observation: { stage: 'collect',energy: 0,position: { room: 'E0N1',x: 4,y: 24 } } });
  if (first.status === 'ready') first.observation.task!.request.quantity = 1;
  expect(JSON.stringify(f.root)).toBe(before);
  f.creep.store.energy = 56; expect(f.read(f.context)).toMatchObject({ observation: { stage: 'deliver',energy: 56,task: { remaining: 100 } } });
});
test('pending evidence stays owned by the journal and never fabricates settlement receipts',() => {
  const f = fixture(); f.pending(); f.creep.store.energy = 100; const before = JSON.stringify(f.root);
  expect(f.read(f.context)).toMatchObject({ observation: { stage: 'pending',journal: { acknowledged: false,result: null },energy: 100 } });
  expect(JSON.stringify(f.root)).toBe(before);
  f.journal.settle({ tick: 10,events: [{ source: 'container',target: f.creep.id,resource: 'energy',amount: 100 }] }); f.journal.acknowledge('attempt');
  expect(f.read(f.context)).toMatchObject({ observation: { stage: 'deliver' } });
});
test('empty actors without tasks remain idle/spawning without initializing missing namespaces',() => {
  const f = fixture(false),before = JSON.stringify(f.root);
  expect(f.read(f.context)).toMatchObject({ observation: { stage: 'idle' } });
  expect(JSON.stringify(f.root)).toBe(before);
  f.creep.spawning = true; f.context.paid.activeAt = 15;
  expect(f.read(f.context)).toMatchObject({ observation: { stage: 'spawning',activeAt: 15 } });
  f.creep.spawning = false; f.creep.store.energy = 50; expect(f.read(f.context).status).toBe('deferred');
});
test('unknown/stale effects, replaced unit binding and withdrawn authority refuse without writes',() => {
  const f = fixture(); f.pending(); f.game.time = 11; f.creep.ticksToLive--;
  expect(f.read(f.context)).toMatchObject({ reason: 'paid-courier-journal' });
  f.journal.settle({ tick: 11 }); expect(f.read(f.context)).toMatchObject({ reason: 'paid-courier-journal' });
  const other = fixture(); other.creep.id = 'replacement'; expect(other.read(other.context)).toMatchObject({ reason: 'paid-courier-task' });
  other.assignments.reconcile({ home: 'W0N1',tick: 10,lifetime: 100,expectedRevision: other.assignments.read().revision,plans: [] });
  expect(other.read(other.context)).toMatchObject({ reason: 'paid-courier-authority' });
});

test('completed owned tasks retain a completion phase rather than restarting collection',() => {
  const f = fixture(); createLogisticsRequests(f.state,'W0N1').confirm(f.request.owner,'trip',{ id: 'receipt',amount: 100 },10);
  const before = JSON.stringify(f.root);
  expect(f.read(f.context)).toMatchObject({ observation: { stage: 'completion',task: { remaining: 0 } } });
  expect(JSON.stringify(f.root)).toBe(before);
});
test('foreign state envelopes and budget denial defer without repairs or initialization',() => {
  const f = fixture(); f.state.write('tasks/courier',{ owner: 'foreign',version: 2,data: {} }); const before = JSON.stringify(f.root);
  expect(f.read(f.context)).toMatchObject({ reason: 'paid-courier-state' });
  expect(f.read(f.context,() => false)).toMatchObject({ reason: 'budget' });
  expect(JSON.stringify(f.root)).toBe(before);
});
