import { sameSpawnRequest } from '../../../../capabilities/spawning/placement';
import { assessStartupProject } from '../../../../capabilities/economy/startup/assessment';
import type { StartupReturnPolicy } from '../../../../capabilities/economy/startup/assessment';
import type { SpawnRequest } from '../../../../capabilities/spawning/request';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RemoteFleetProfile } from '../../fleet/model';
import type { StartupPlanningQuery } from '../planning/model';
import { createStartupPlanningJob } from '../planning/runner';
export interface StartupBirthAdmissionContext {
  query: StartupPlanningQuery; policy: StartupReturnPolicy; binding: string; tick: number;
}
/** Current caller context plus completed scratch evidence; never simulates, publishes or reserves capital. */
export function createStartupForecastAdmission(state: StatePort, home: string) {
  const planner = createStartupPlanningJob(state,home);
  return (profile: Readonly<RemoteFleetProfile>, request: Readonly<SpawnRequest>, current: StartupBirthAdmissionContext): boolean => {
    const { query,policy,binding,tick } = current;
    if (!sameContext(home,profile,current) || request.owner !== profile.owner) return false;
    const completed = planner.result(query); if (!completed) return false;
    const participants = [...query.input.project.workers,...query.input.couriers].map(worker => worker.request);
    const assessment = assessStartupProject(completed,query.input.project.spawning.cash.horizon,policy,participants,query.input.household?.labor?.jobs);
    if (!assessment.accepted || query.binding !== binding) return false;
    const proposed = query.input.project.spawning.requests.find(item => item.id === request.id);
    const birth = completed.spawning.births.find(item => item.request === request.id);
    if (!proposed || !participants.includes(request.id) || !birth || birth.startAt+query.observedAt !== tick) return false;
    return sameSpawnRequest(request,{ ...proposed,readyAt: proposed.readyAt+query.observedAt,expiresAt: proposed.expiresAt+query.observedAt });
  };
}
function sameContext(home: string, profile: Readonly<RemoteFleetProfile>, current: StartupBirthAdmissionContext): boolean {
  const { query,tick,binding } = current;
  return profile.home === home && profile.room === query.room && profile.source === query.source && profile.generation === query.generation
    && query.tick === tick && query.binding === binding;
}
