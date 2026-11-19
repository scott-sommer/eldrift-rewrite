import type { StatePort } from '../../../persistence/versioned-state';
import type { createNativeDispatch } from '../../native-dispatch';
import { createRemoteAssignmentStore } from '../../../features/remotes/assignment-store';
import { cancelRemotePopulation } from '../cancel-population';
import { remotePopulationIdentity } from './identity';
/** Room exclusion persists independently of discovery and recruitment budgets; other homes retain their leases. */
export function enforceUnreachableRooms(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, home: string, blocked: ReadonlySet<string>): void {
  if (!blocked.size) return;
  const assignments = createRemoteAssignmentStore(state), current = assignments.read();
  const scope = current.assignments.filter(item => item.home === home && blocked.has(item.plan.room)).map(item => item.plan.room);
  if (scope.length) {
    const result = assignments.reconcile({ home,tick: Game.time,expectedRevision: current.revision,lifetime: 1,plans: [],scope });
    if (result.status !== 'applied') throw new Error('Reachability lease withdrawal conflict');
  }
  cancelRemotePopulation(state,dispatch,home,new Set(),owner => {
    const identity = remotePopulationIdentity(owner); return identity && blocked.has(identity.room) ? identity : undefined;
  });
}
