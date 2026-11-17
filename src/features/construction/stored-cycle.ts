import { copyPlain } from '../../persistence/plain-data';
import type { PlanState } from '../planning/plan-model';
import { runConstructionCycle } from './executor';
import type { ConstructionExecutionPorts, ConstructionExecutionBudget } from './executor';
import type { ConstructionOrderPolicy } from './order';
import type { createConstructionProgressStore } from './progress-store';
/** Resume bounded scans by exact desired-plan/policy identity; recheck authority before every side effect. */
export function createStoredConstructionCycle(
  store: ReturnType<typeof createConstructionProgressStore>, readPlan: () => PlanState,
  ports: ConstructionExecutionPorts, order: ConstructionOrderPolicy,
) {
  order = copyPlain(order);
  return { advance(budget: Omit<ConstructionExecutionBudget, 'start'>, guard: () => boolean) {
    if (!guard()) return { status: 'deferred' as const };
    const plan = copyPlain(readPlan()), record = store.read();
    if (plan.room !== record.room) throw new Error('Construction plan room mismatch');
    const identity = constructionIdentity(plan, order), start = record.identity === identity ? record.next : 0;
    let stale = false;
    const result = runConstructionCycle(plan.entries, { observe: ports.observe,
      create(entry) {
        stale = stale || constructionIdentity(readPlan(), order) !== identity || store.read().revision !== record.revision;
        if (stale) return { status: 'retry', reason: 'construction-authority-changed' };
        return ports.create(entry);
      } }, order, { ...budget, start }, () => !stale && guard());
    if (stale) return { status: 'stale' as const, result };
    const saved = store.save(record.revision, identity, result.next);
    return { status: saved.ok ? 'advanced' as const : 'conflict' as const, result };
  } };
}
function constructionIdentity(plan: PlanState, order: ConstructionOrderPolicy): string {
  if (!Number.isSafeInteger(plan.revision) || plan.revision < 0) throw new Error('Invalid construction plan revision');
  return JSON.stringify(['construction-cycle-v1', plan.room, plan.revision, plan.entries, order]);
}
