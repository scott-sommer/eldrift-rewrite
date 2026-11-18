import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createRemoteAssignmentStore } from '../../src/features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../src/features/remotes/assignment-demand';
import { createRemoteInfrastructureStore } from '../../src/features/remotes/infrastructure/store';
import type { RemoteInfrastructureRoute } from '../../src/features/remotes/infrastructure/model';
export function infrastructureFixture() {
  const root = {}, state = createMemoryPort(() => root), assignments = createRemoteAssignmentStore(state);
  const plans = [{ room: 'E0N1',sources: ['source'],reserve: null,infrastructure: { roads: true,containers: true } }];
  assignments.reconcile({ home: 'W0N1',tick: 1,lifetime: 50,expectedRevision: 0,plans });
  const demand = remoteAssignmentDemands(assignments.owner('E0N1',1)!,1).find(item => item.kind === 'outpost')!;
  if (demand.kind !== 'outpost') throw new Error('Expected outpost');
  const route: RemoteInfrastructureRoute = { source: 'source',target: { room: 'E0N1',x: 3,y: 25 },station: { room: 'E0N1',x: 2,y: 25 },
    path: [{ room: 'W0N1',x: 48,y: 25 },{ room: 'W0N1',x: 49,y: 25 },{ room: 'E0N1',x: 0,y: 25 },{ room: 'E0N1',x: 1,y: 25 },{ room: 'E0N1',x: 2,y: 25 }] };
  const store = createRemoteInfrastructureStore(state,'W0N1','E0N1'), draft = { identity: 'topology',sources: ['source'],routes: [route] };
  return { root,state,assignments,plans,demand,route,store,draft };
}
