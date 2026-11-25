import { createLaborBirthAdmission } from '../labor-birth-admission';
import { createNativeLaborObservation } from '../remotes/startup/household/labor-observation';
import type { StatePort } from '../../persistence/versioned-state';
import type { TaskDefinition } from '../../persistence/tasks/schema';
/** Current spawn/source/work facts; policy and physical payment remain separate admission owners. */
export function createNativeLaborBirthAdmission(state: StatePort, enabled: (home: string, owner: string) => boolean, definitions: Readonly<Record<string,TaskDefinition>> = {}) {
  const observe = createNativeLaborObservation(state);
  return createLaborBirthAdmission(state,{ now: () => Game.time,current(proposal) {
    const request = proposal.input.request;
    if (!enabled(request.room,request.owner)) return false;
    const current = observe(proposal.input);
    return current.status === 'observed' && JSON.stringify(current.facts) === JSON.stringify(proposal.facts);
  } },definitions);
}
