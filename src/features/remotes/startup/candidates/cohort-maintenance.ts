import { startupQueueMatches } from '../queue-fence';
import { assessStartupProject } from '../../../../capabilities/economy/startup/assessment';
import type { StatePort } from '../../../../persistence/versioned-state';
import { createStartupPlanningJob } from '../planning/runner';
import { startupPriorBirthsMatch } from './birth-admission';
import type { StartupBirthAdmissionContext, StartupResultReader } from './birth-admission';
import { cleanupStartupCohort } from './cohort-cleanup';
/** Producer-side invalidation; final admission stays read-only and independently fences every payment. */
export function createStartupCohortMaintenance(state: StatePort, home: string, readResult: StartupResultReader = createStartupPlanningJob(state,home).result) {
  return (current: StartupBirthAdmissionContext, occupiedNames: ReadonlySet<string>) => {
    const reason = invalidation(current);
    return reason ? { status: 'invalid' as const,reason,...cleanupStartupCohort(state,home,current.query,occupiedNames) } : { status: 'current' as const };
  };
  function invalidation(current: StartupBirthAdmissionContext): string | undefined {
    const { query,policy,binding,tick } = current;
    if (query.tick !== tick || query.binding !== binding) return 'binding';
    if (!startupQueueMatches(state,home,query,{ births: current.births })) return 'queue-context';
    const completed = readResult(query); if (!completed) return 'planning-evidence';
    if (!startupPriorBirthsMatch(completed.spawning.births,query.input.project.spawning.requests,current)) return 'cohort-progress';
    const participants = [...query.input.project.workers,...query.input.couriers].map(worker => worker.request);
    const assessment = assessStartupProject(completed,query.input.project.spawning.cash.horizon,policy,participants,query.input.household?.labor?.jobs);
    return assessment.accepted ? undefined : 'return-policy';
  }
}
