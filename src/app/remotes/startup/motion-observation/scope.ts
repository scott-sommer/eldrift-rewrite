import { createRemoteAssignmentStore } from '../../../../features/remotes/assignment-store';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { PaidSourceContext } from './source-model';
export function paidSourceLeaseCurrent(state: StatePort,context: PaidSourceContext): boolean {
  const scope = context.cohort,lease = createRemoteAssignmentStore(state).owner(scope.room,Game.time);
  return !!lease && lease.home === scope.home && lease.generation === scope.generation && lease.plan.sources.includes(scope.source);
}
