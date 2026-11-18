import type { StateSchema } from '../../persistence/versioned-state';
import type { RemoteAssignmentState } from './assignment-model';
import { natural, object, validRemoteAssignment } from './assignment-validation';
export const remoteAssignmentSchema: StateSchema<RemoteAssignmentState> = {
  owner: 'remotes',version: 1,migrations: {},
  initial: () => ({ revision: 0,clock: 0,assignments: [] }),
  valid(value: unknown): value is RemoteAssignmentState {
    if (!object(value) || !natural(value.revision) || !natural(value.clock)) return false;
    if (!Array.isArray(value.assignments) || value.assignments.length > 128 || !value.assignments.every(validRemoteAssignment)) return false;
    const assignments = value.assignments;
    if (new Set(assignments.map(item => item.plan.room)).size !== assignments.length) return false;
    const sources = assignments.flatMap(item => item.plan.sources);
    return new Set(sources).size === sources.length && assignments.every(item => item.generation <= Number(value.revision) && item.renewedAt <= Number(value.clock));
  },
};
