import { afterEach,expect,test,vi } from 'vitest';
import { remoteCollectionAdmission } from '../../../src/app/remotes/transport-admission';
import { remoteTransportOwner } from '../../../src/features/remotes/transport-authority';
import { submitHaulingTask } from '../../../src/app/submit-hauling-task';
import { haulingDefinitions } from '../../../src/app/remotes/startup/hauling-state/opening';
import { createMemoryPort } from '../../../src/adapters/screeps/memory';
import { createLogisticsRequests } from '../../../src/features/logistics/request-store';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import { paidHomeSourceDemand } from '../../../src/app/remotes/startup/home-observation/demand';
import { startupFixture } from '../../fixtures/remote-startup';
import { startupTravelPlan } from '../../fixtures/startup-travel';
import type { RemoteTransportDemand } from '../../../src/features/remotes/transport-authority';
afterEach(() => vi.unstubAllGlobals());
const demand: RemoteTransportDemand = { kind: 'mine',id: 'mine',assignment: 'lease',home: 'W0N1',room: 'E0N1',source: 'source',generation: 1,expiresAt: 25 };
const input = { home: 'W0N1',name: 'courier',unitId: 'native',actor: 'fleet',tick: 10,demand,source: 'container',sink: 'bank',maximum: 100 };
const available = { sourceStock: 25,sinkFree: 100,sinkPool: logisticsPool('capacity','bank') };

test('shared native/forecast admission retains lease identity and books the actual smaller load before assigning', () => {
  const candidate = remoteCollectionAdmission(input,{ minimumBatch: 20,requestLifetime: 200 },() => available)!;
  expect(candidate.request).toMatchObject({ owner: remoteTransportOwner(demand,'fleet'),quantity: 100,expiresAt: 25 });
  const root = {},state = createMemoryPort(() => root);
  expect(submitHaulingTask(state,haulingDefinitions,candidate)).toBe(true);
  expect(createLogisticsRequests(state,'W0N1').findPending(candidate.request.owner,candidate.request.id,10)?.quantity).toBe(25);
});

test('expired leases cannot read physical stock or create an assumed renewal', () => {
  const observe = vi.fn(() => available);
  expect(remoteCollectionAdmission({ ...input,tick: 25 },{ minimumBatch: 20,requestLifetime: 200 },observe)).toBeUndefined();
  expect(observe).not.toHaveBeenCalled();
  expect(() => remoteCollectionAdmission({ ...input,home: 'E0N1' },{ minimumBatch: 20,requestLifetime: 200 },observe)).toThrow('identity');
});

test('source demand snapshots retain the actual current lease/generation without writing owners', () => {
  const f = startupFixture(),before = JSON.stringify(f.root),group = { plan: startupTravelPlan(),cohort: { home: 'W0N1',room: 'E0N1',source: 'source',generation: 1,endpoint: 'bank',observedAt: 1,approvedAt: 1,sinkCapacity: 1000,workers: [] } };
  const readonly = { read: f.state.read,write: () => { throw new Error('Unexpected write'); } };
  expect(paidHomeSourceDemand(readonly,group,1)).toMatchObject({ kind: 'mine',home: 'W0N1',source: 'source',generation: 1,expiresAt: 101 });
  group.cohort.generation = 2; expect(paidHomeSourceDemand(readonly,group,1)).toBeUndefined();
  expect(JSON.stringify(f.root)).toBe(before);
});
