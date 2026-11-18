import { openState, peekState, saveState } from '../../../persistence/versioned-state';
import type { StatePort } from '../../../persistence/versioned-state';
import { stateKey } from '../../../persistence/state-key';
import { framedIdentity } from '../../../core/framed-identity';
import { createRemoteAssignmentStore } from '../assignment-store';
import { remoteInfrastructureSchema } from './schema';
import { compileRemoteInfrastructure } from './plan';
import type { RemoteInfrastructureDraft, RemoteOutpostDemand } from './model';
/** Stable per-home target namespace; a new lease generation replaces stale desired state instead of leaking namespaces. */
export function createRemoteInfrastructureStore(state: StatePort, home: string, room: string) {
  const key = stateKey('remoteInfrastructure',framedIdentity([home,room])), schema = remoteInfrastructureSchema(home,room);
  const assignments = createRemoteAssignmentStore(state), read = () => peekState(state,key,schema) ?? schema.initial();
  function save(expected: number, demand: RemoteOutpostDemand, draft: RemoteInfrastructureDraft, tick: number) {
    const current = read(), live = assignments.resolve(demand,tick);
    if (current.revision !== expected) return { status: 'conflict' as const };
    if (live?.kind !== 'outpost' || live.home !== home || live.room !== room) return { status: 'revoked' as const };
    const assignment = assignments.owner(room,tick)!;
    if (JSON.stringify([...draft.sources].sort()) !== JSON.stringify(assignment.plan.sources)) return { status: 'sources-changed' as const };
    const revision = current.revision+1, complete = draft.sources.length === draft.routes.length;
    const compiled = complete ? compileRemoteInfrastructure(live,draft.routes,revision) : { plans: [],stations: [] };
    const next = { home,room,revision,generation: live.generation,draft,...compiled };
    if (!schema.valid(next)) throw new Error('Invalid infrastructure draft');
    openState(state,key,schema); saveState(state,key,schema,next);
    return { status: complete ? 'planned' as const : 'draft' as const,record: read() };
  }
  return { read,save };
}
