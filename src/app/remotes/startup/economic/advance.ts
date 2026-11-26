import { startupQueueMatches } from '../../../../features/remotes/startup/queue-fence';
import { createStartupPlanningJob, assessCompletedStartupPlanning } from '../../../../features/remotes/startup/planning/runner';
import { createStartupApprovals } from '../../../../features/remotes/startup/approvals/catalog';
import { createStartupSelections } from '../../../../features/remotes/startup/selection-store';
import { publishStartupCohort } from '../../../../features/remotes/startup/publish-cohort';
import { cleanupStartupCohort } from '../../../../features/remotes/startup/candidates/cohort-cleanup';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { EconomicExecutionContext } from './context';
/** One cooperative home job; queue publication precedes approval, so a partial publication is never payable. */
export function advanceEconomicProposal(state: StatePort, home: string, current: EconomicExecutionContext, config: Readonly<RuntimeConfig>, guard: () => boolean): boolean {
  const planner = createStartupPlanningJob(state,home), { query } = current;
  const deadline = firstCohortDeadline(current);
  if (current.binding !== query.binding || Game.time >= deadline || Game.time > query.expiresAt || !startupQueueMatches(state,home,query)) { discardEconomicProposal(state,home,current); return false; }
  const planning = current.planning ?? planner.inspect(), record = planning.record, horizon = query.input.project.spawning.cash.horizon;
  let completed = record.job?.checkpoint.tick === horizon+1 ? planning.result(query) : undefined;
  if (!completed && record.clock !== Game.time) {
    const progress = planning.advance({ ...query,expectedRevision: record.revision },config.remoteStartupFrames,guard);
    if (progress.status === 'complete') completed = progress.result;
  }
  if (!completed || !guard()) return false;
  if (!cohortStartsBeforeExpiry(completed.spawning.births,current) || !assessCompletedStartupPlanning(completed,query,current.policy).accepted) return false;
  if (!startupQueueMatches(state,home,query)) { discardEconomicProposal(state,home,current); return false; }
  const published = publishStartupCohort(state,home,query,new Set(Object.keys(Game.creeps)));
  if (published !== 'published') { discardEconomicProposal(state,home,current); return false; }
  const approvals = createStartupApprovals(state,home);
  return approvals.capture({ query,quote: current.quote,rooms: current.rooms,policy: current.policy },approvals.read().revision) === 'saved';
}
export function discardEconomicProposal(state: StatePort, home: string, current: EconomicExecutionContext): void {
  cleanupStartupCohort(state,home,current.query,new Set(Object.keys(Game.creeps)));
  const planner = createStartupPlanningJob(state,home), record = planner.read();
  planner.withdraw(record.revision,Game.time,current.query);
  const selections = createStartupSelections(state,home); selections.withdraw(selections.read().revision,Game.time,current.query);
}
export function firstCohortDeadline(current: EconomicExecutionContext): number {
  const participants = new Set([...current.query.input.project.workers,...current.query.input.couriers].map(worker => worker.request));
  return current.query.observedAt+Math.min(...current.query.input.project.spawning.requests.filter(request => participants.has(request.id)).map(request => request.readyAt));
}

function cohortStartsBeforeExpiry(births: readonly import('../../../../capabilities/economy/startup/spawn-model').StartupScheduledBirth[], current: EconomicExecutionContext): boolean {
  const participants = new Set([...current.query.input.project.workers,...current.query.input.couriers].map(worker => worker.request));
  return births.filter(birth => participants.has(birth.request)).every(birth => birth.startAt+current.query.observedAt < current.query.expiresAt);
}
