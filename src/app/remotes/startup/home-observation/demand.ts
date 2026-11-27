import { createRemoteAssignmentStore } from '../../../../features/remotes/assignment-store';
import { remoteAssignmentDemands } from '../../../../features/remotes/assignment-demand';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { PaidHomeGroup } from './model';
/** The current token is a fact, not permission to invent a future lease renewal. */
export function paidHomeSourceDemand(state: StatePort,group: PaidHomeGroup,tick: number) {
  const lease = createRemoteAssignmentStore(state).owner(group.cohort.room,tick);
  if (!lease || lease.home !== group.cohort.home || lease.generation !== group.cohort.generation) return undefined;
  return remoteAssignmentDemands(lease,tick).find(demand => demand.kind === 'mine' && demand.source === group.cohort.source);
}
