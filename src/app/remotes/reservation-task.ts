import type { StatePort } from '../../persistence/versioned-state';
import type { RemoteAssignmentDemand } from '../../features/remotes/assignment-model';
import { createRemoteTaskBehavior } from './task';
import type { RemoteTaskPorts, RemoteTaskPayload } from './task';
export { validRemoteTaskPayload as validReservationPayload } from './task';
export type ReservationDemand = Extract<RemoteAssignmentDemand, { kind: 'reserve' }>;
export type ReservationTaskPayload = RemoteTaskPayload;
export type ReservationTaskPorts<Context> = RemoteTaskPorts<Context, ReservationDemand>;
export function createReservationTaskBehavior<Context>(state: StatePort, ports: ReservationTaskPorts<Context>) {
  return createRemoteTaskBehavior(state,'reserve',ports);
}
