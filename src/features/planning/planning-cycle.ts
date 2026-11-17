import { planningJobState } from './planning-job-state';
import { advancePlanningJob } from './planning-job';
import { commitPlanOnce } from './commit-plan-once';
import type { PlanningJobInput } from './planning-job-model';
import type { createPlanningJobStore } from './planning-job-store';
import type { createPlanStore } from './plan-store';
import type { PlanState } from './plan-model';
export interface PlanningCyclePorts {
  jobs: Pick<ReturnType<typeof createPlanningJobStore>, 'read' | 'save' | 'clear' | 'finish'>; plans: ReturnType<typeof createPlanStore>;
  validateCommit: (plan: PlanState) => boolean;
}
/** Caller supplies the current request; completed receipts suppress repeat work for that request. */
export function runPlanningCycle(
  ports: PlanningCyclePorts, input: PlanningJobInput, tick: number,
  maximumSteps: number, canContinue: () => boolean = () => true,
) {
  validateCycleBudget(tick, maximumSteps);
  const signature = planningJobState(input).signature;
  let job = ports.jobs.read();
  const plan = ports.plans.read();
  if (job.receipt?.signature === signature && job.receipt.planRevision === plan.revision) {
    return { status: 'idle' as const, receipt: job.receipt };
  }
  const recovering = job.checkpoint?.signature === signature && plan.revision === input.baseRevision + 1;
  if (plan.revision !== input.baseRevision && !recovering) return { status: 'superseded' as const };
  if (job.checkpoint && job.checkpoint.signature !== signature) {
    const cleared = ports.jobs.clear(job.revision);
    if (!cleared.ok) return { status: 'conflict' as const };
    job = cleared.record;
  }
  const result = advancePlanningJob(input, job.checkpoint, maximumSteps, canContinue);
  const saved = ports.jobs.save(job.revision, result.checkpoint);
  if (!saved.ok) return { status: 'conflict' as const };
  if (!result.done) return { status: 'pending' as const, steps: result.steps };
  return finishCycle(ports, input, tick, saved.record.revision, result);
}
function finishCycle(
  ports: PlanningCyclePorts, input: PlanningJobInput, tick: number, revision: number,
  result: Extract<ReturnType<typeof advancePlanningJob>, { done: true }>,
) {
  let recovered = false;
  if ('proposal' in result && result.proposal) {
    const committed = commitPlanOnce(ports.plans, input.baseRevision, result.proposal,
      { tick, observation: input.observation, policy: input.policy }, ports.validateCommit);
    if (!committed.ok) return { status: 'commit-rejected' as const, reason: committed.reason };
    recovered = committed.recovered;
  }
  const outcome = 'proposal' in result && result.proposal ? 'committed' as const : result.reason!;
  const finished = ports.jobs.finish(revision, { signature: result.checkpoint.signature,
    planRevision: ports.plans.read().revision, completedAt: tick, outcome });
  if (!finished.ok) return { status: 'conflict' as const };
  return { status: 'finished' as const, outcome, recovered, steps: result.steps };
}

function validateCycleBudget(tick: number, steps: number): void {
  if (!Number.isSafeInteger(tick) || tick < 0) throw new Error('Invalid planning tick');
  if (!Number.isSafeInteger(steps) || steps < 0) throw new Error('Invalid planning step budget');
}
