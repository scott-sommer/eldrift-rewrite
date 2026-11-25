import { peekTaskHead } from '../persistence/tasks/head';
import type { StatePort } from '../persistence/versioned-state';
import type { TaskDefinition } from '../persistence/tasks/schema';
import type { SpawnRequest } from '../capabilities/spawning/request';
import { sameSpawnRequest } from '../capabilities/spawning/placement';
import { createLaborTaskStaging } from '../features/work/stage-labor-task';
import { materializeLaborBirth } from '../features/work/labor-birth';
import type { LaborTaskPayload } from '../features/work/labor-task';
import type { LaborProposalSnapshot } from '../capabilities/economy/startup/household/labor/proposal';
export interface LaborBirthAdmissionPorts { now(): number; current(proposal: LaborProposalSnapshot): boolean }
/** Read-only final check; a guarded request cannot silently become ordinary after task loss. */
export function createLaborBirthAdmission(state: StatePort, ports: LaborBirthAdmissionPorts, definitions: Readonly<Record<string,TaskDefinition>> = {}) {
  const staging = createLaborTaskStaging(state,definitions);
  return (request: SpawnRequest): boolean => {
    const head = peekTaskHead(state,request.name);
    if (!request.admission) return head?.kind !== 'household-labor';
    if (head?.kind !== 'household-labor' || head.id !== request.admission.task || head.phase !== 'await-birth') return false;
    const payload = staging.read(request.name)!.queue[0]!.payload as LaborTaskPayload;
    if (payload.progress) return false;
    const quoted = materializeLaborBirth(payload.proposal,ports.now());
    return quoted.status === 'ready' && sameSpawnRequest(quoted.request,request) && ports.current(payload.proposal);
  };
}
