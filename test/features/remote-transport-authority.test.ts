import { expect, test } from 'vitest';
import { remoteTransportAuthority, remoteTransportOwner, transportToken } from '../../src/features/remotes/transport-authority';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { logisticsPool } from '../../src/capabilities/logistics/request';
test('transport identities retain exact home actor and lease generation, with request expiry fencing', () => {
  const root = {}, store = createRemoteAssignmentStore(createMemoryPort(() => root));
  store.reconcile({ home: 'W0N1',tick: 1,lifetime: 20,expectedRevision: 0,plans: [{ room: 'E0N1',sources: ['source'],reserve: null,infrastructure: null }] });
  const demand = remoteAssignmentDemands(store.read().assignments[0]!,1)[0]!;
  if (demand.kind !== 'mine') throw new Error('Expected source demand');
  const owner = remoteTransportOwner(demand,'hauler:one'), authority = remoteTransportAuthority(owner)!;
  expect(authority).toEqual({ home: 'W0N1',actor: 'hauler:one',id: demand.id,assignment: demand.assignment,generation: 1 });
  expect(remoteTransportOwner(demand,'hauler:two')).not.toBe(owner);
  const token = transportToken({ id: 'trip',owner,source: 'container',sink: 'home',resource: 'energy',quantity: 10,priority: 0,expiresAt: 10 })!;
  expect(store.resolve(token,9)?.id).toBe(demand.id); expect(store.resolve(token,10)).toBeUndefined();
  store.reconcile({ home: 'W0N1',tick: 2,lifetime: 20,expectedRevision: 1,plans: [] });
  expect(store.resolve(token,3)).toBeUndefined();
});
test('foreign namespaces malformed tuples and noncanonical generations cannot become transport authority', () => {
  for (const owner of ['', '[]', 'logistics:{', logisticsPool('other','W0N1','actor','id','assignment','1'),
    logisticsPool('remote-transport','W0N1','actor','id','assignment','01'),logisticsPool('remote-transport','bad','actor','id','assignment','1')]) {
    expect(remoteTransportAuthority(owner)).toBeUndefined();
  }
});
