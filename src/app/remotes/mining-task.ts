import type { StatePort } from '../../persistence/versioned-state';
import type { RemoteAssignmentDemand } from '../../features/remotes/assignment-model';
import { createRemoteTaskBehavior } from './task';
import type { RemoteTaskPorts } from './task';
export type RemoteMiningDemand = Extract<RemoteAssignmentDemand, { kind: 'mine' }>;
export type RemoteMiningTaskPorts<Context> = RemoteTaskPorts<Context,RemoteMiningDemand>;
export function createRemoteMiningTaskBehavior<Context>(state: StatePort, ports: RemoteMiningTaskPorts<Context>) {
  return createRemoteTaskBehavior(state,'mine',ports);
}
