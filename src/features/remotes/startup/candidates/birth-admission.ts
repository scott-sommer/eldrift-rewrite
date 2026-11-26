import { sameSpawnRequest } from '../../../../capabilities/spawning/placement';
import { assessStartupProject } from '../../../../capabilities/economy/startup/assessment';
import type { StartupReturnPolicy } from '../../../../capabilities/economy/startup/assessment';
import type { BodyPart } from '../../../../capabilities/spawning/body';
import type { StartupScheduledBirth } from '../../../../capabilities/economy/startup/spawn-model';
import type { SpawnRequest } from '../../../../capabilities/spawning/request';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RemoteFleetProfile } from '../../fleet/model';
import type { StartupPlanningQuery } from '../planning/model';
import { createStartupPlanningJob } from '../planning/runner';
export interface StartupObservedBirth { request: string; owner: string; home: string; body: readonly BodyPart[]; startAt: number; activeAt: number }
export interface StartupBirthAdmissionContext {
  query: StartupPlanningQuery; policy: StartupReturnPolicy; binding: string; tick: number; births?: readonly StartupObservedBirth[];
}
/** Current caller context plus completed scratch evidence; never simulates, publishes or reserves capital. */
export type StartupResultReader = ReturnType<typeof createStartupPlanningJob>['result'];
export function createStartupForecastAdmission(state: StatePort, home: string, readResult: StartupResultReader = createStartupPlanningJob(state,home).result) {
  return (profile: Readonly<RemoteFleetProfile>, request: Readonly<SpawnRequest>, current: StartupBirthAdmissionContext): boolean => {
    const { query,policy } = current, marker = request.admission;
    if (marker?.kind === 'remote-startup' && (marker.generation !== query.generation || marker.observedAt !== query.observedAt)) return false;
    if (!sameContext(home,profile,current) || request.owner !== profile.owner) return false;
    const completed = readResult(query); if (!completed) return false;
    const participants = [...query.input.project.workers,...query.input.couriers].map(worker => worker.request);
    const assessment = assessStartupProject(completed,query.input.project.spawning.cash.horizon,policy,participants,query.input.household?.labor?.jobs);
    if (!assessment.accepted) return false;
    if (!startupPriorBirthsMatch(completed.spawning.births,query.input.project.spawning.requests,current)) return false;
    return matchesSlot(completed.spawning.births,request,query,participants);
  };
}
function sameContext(home: string, profile: Readonly<RemoteFleetProfile>, current: StartupBirthAdmissionContext): boolean {
  const { query,tick,binding } = current;
  return profile.home === home && profile.room === query.room && profile.source === query.source && profile.generation === query.generation
    && query.tick === tick && query.binding === binding;
}

export function startupPriorBirthsMatch(births: readonly StartupScheduledBirth[], requests: readonly SpawnRequest[], current: StartupBirthAdmissionContext): boolean {
  const epoch = current.query.observedAt;
  return births.filter(birth => birth.startAt+epoch < current.tick).every(birth => {
    const request = requests.find(request => request.id === birth.request), observed = current.births?.find(item => item.request === birth.request);
    return !!request && !!observed && observed.owner === request.owner && observed.home === (request.home ?? request.room)
      && JSON.stringify(observed.body) === JSON.stringify(request.body) && observed.startAt === birth.startAt+epoch && observed.activeAt === birth.activeAt+epoch;
  });
}

function matchesSlot(births: readonly StartupScheduledBirth[], request: Readonly<SpawnRequest>, query: StartupPlanningQuery, participants: readonly string[]): boolean {
  const proposed = query.input.project.spawning.requests.find(item => item.id === request.id), birth = births.find(item => item.request === request.id);
  if (!proposed || !participants.includes(request.id) || !birth || birth.startAt+query.observedAt !== query.tick) return false;
  return sameSpawnRequest(request,{ ...proposed,readyAt: proposed.readyAt+query.observedAt,expiresAt: proposed.expiresAt+query.observedAt });
}
