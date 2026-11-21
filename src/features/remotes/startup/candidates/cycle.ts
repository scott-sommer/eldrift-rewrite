import { snapshotStartupProject } from '../../../../capabilities/economy/startup/snapshot';
import type { StartupReturnPolicy } from '../../../../capabilities/economy/startup/assessment';
import type { StartupProjectOrder } from '../../../../capabilities/economy/startup/choice';
import type { StatePort } from '../../../../persistence/versioned-state';
import { natural } from '../../assignment-validation';
import { createStartupPlanningJob } from '../planning/runner';
import { createStartupCandidateCatalog } from './catalog';
import type { StartupCandidateQuery } from './model';
export interface StartupCandidateBudget { frames: number; candidates: number }
/** Evaluation/capture only; callers reserve serialization budget and independently admit any real effects. */
export function createStartupCandidateCycle(state: StatePort, home: string) {
  const planner = createStartupPlanningJob(state,home), catalog = createStartupCandidateCatalog(state,home);
  function advance(input: readonly StartupCandidateQuery[], inputPolicy: StartupReturnPolicy, order: StartupProjectOrder, budget: StartupCandidateBudget, guard: () => boolean = () => true) {
    validateBudget(budget,input.length);
    const candidates = input.map(item => ({ id: item.id,query: { ...item.query,input: snapshotStartupProject(item.query.input) } }));
    const policy = { ...inputPolicy }, limits = { ...budget };
    let frames = 0,processed = 0;
    if (!guard()) return deferred('admission',frames,processed);
    const initial = catalog.choose(candidates,policy,order);
    if (initial.status === 'complete') return { ...initial,frames,processed };
    for (const candidate of candidates) {
      if (catalog.lookup(candidate.id,candidate.query,policy)) continue;
      if (processed >= limits.candidates) return deferred('budget',frames,processed);
      if (!guard()) return deferred('admission',frames,processed);
      processed++;
      const progress = evaluate(candidate,policy,limits.frames-frames,guard);
      frames += progress.frames;
      if (progress.status === 'deferred') return deferred(progress.reason,frames,processed);
    }
    return { ...catalog.choose(candidates,policy,order),frames,processed };
  }
  function evaluate(candidate: StartupCandidateQuery, policy: StartupReturnPolicy, frames: number, guard: () => boolean) {
    const progress = planner.advance({ ...candidate.query,expectedRevision: planner.read().revision },frames,guard);
    if (progress.status === 'deferred') return progress;
    if (!guard()) return deferred('admission',progress.frames,1);
    const captured = catalog.capture(candidate.id,candidate.query,policy,catalog.read().revision);
    return captured === 'saved' ? { status: 'complete' as const,frames: progress.frames } : deferred(captured,progress.frames,1);
  }
  return { advance };
}
function validateBudget(budget: StartupCandidateBudget, count: number): void {
  if (!natural(budget.frames) || budget.frames > 10001 || !natural(budget.candidates) || budget.candidates > 16 || count > 16) throw new Error('Invalid startup candidate cycle budget');
}
function deferred(reason: string, frames: number, processed: number) { return { status: 'deferred' as const,reason,frames,processed }; }
