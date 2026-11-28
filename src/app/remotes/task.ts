import type { Outcome } from '../../core/execution/model';
import type { StatePort } from '../../persistence/versioned-state';
import { createRemoteAssignmentStore } from '../../features/remotes/assignment-store';
import { natural, object, room } from '../../features/remotes/assignment-validation';
import type { RemoteAssignmentDemand } from '../../features/remotes/assignment-model';
import type { TaskBehavior } from '../task-runner';
import { taskScope } from '../task-runner';
export interface RemoteTaskPayload {
  home: string; token: Pick<RemoteAssignmentDemand, 'id' | 'assignment' | 'generation' | 'expiresAt'>;
}
export interface RemoteTaskPorts<Context, Demand extends RemoteAssignmentDemand> {
  clock(): number; unit(context: Context): string;
  service(context: Context, demand: Demand, owner: string): Outcome;
  retire(context: Context, home: string, owner: string): Outcome;
}
export function validRemoteTaskPayload(value: unknown): value is RemoteTaskPayload {
  if (!object(value) || !room(value.home) || !object(value.token)) return false;
  const token = value.token;
  return text(token.id) && text(token.assignment) && natural(token.generation) && token.generation > 0 && natural(token.expiresAt);
}
function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 1024; }
export const remoteTaskDefinition = { phases: ['work'],validPayload: validRemoteTaskPayload };
/** Continuous service uses the shared task runner; waits do not consume failure retries. */
export function createRemoteTaskBehavior<Context, Kind extends RemoteAssignmentDemand['kind']>(state: StatePort, kind: Kind,
  ports: RemoteTaskPorts<Context, Extract<RemoteAssignmentDemand, { kind: Kind }>>): TaskBehavior<Context> {
  const assignments = createRemoteAssignmentStore(state);
  return { ...remoteTaskDefinition,
    handlers: task => ({ work: context => {
      const payload = task.payload as RemoteTaskPayload;
      const demand = assignments.resolve(payload.token,ports.clock());
      const owner = taskScope(ports.unit(context),task.id);
      const result = demand?.kind === kind && demand.home === payload.home
        ? ports.service(context,demand as Extract<RemoteAssignmentDemand, { kind: Kind }>,owner) : ports.retire(context,payload.home,owner);
      return result.status === 'blocked' ? { status: 'running' } : result;
    } }),
  };
}
