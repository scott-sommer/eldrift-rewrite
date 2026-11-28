import { peekState } from '../../../../persistence/versioned-state';
import type { StatePort } from '../../../../persistence/versioned-state';
import { remoteAssignmentSchema } from '../../../../features/remotes/assignment-schema';
import { reservationSchema } from '../../../../persistence/reservations/schema';
import type { PaidHomeControl } from './model';
/** Copy complete owners, retaining outside/expired records and revisions; no synthetic lease or cleanup. */
export function observePaidHomeControl(state: StatePort,tick: number): PaidHomeControl {
  const assignments = peekState(state,'remotes/assignments',remoteAssignmentSchema) ?? null;
  const reservations = peekState(state,'reservations/empire',reservationSchema) ?? null;
  if (assignments && assignments.clock > tick) throw new Error('Future home assignment control');
  if (reservations && reservations.claims.length > 512) throw new Error('Home station claim bound exceeded');
  return { assignments,reservations };
}
