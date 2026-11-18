import { framedIdentity } from '../../../core/framed-identity';
import type { StatePort } from '../../../persistence/versioned-state';
import { createStoredConstructionCycle } from '../../construction/stored-cycle';
import { createConstructionProgressStore } from '../../construction/progress-store';
import { constructionTypeOrder } from '../../construction/order';
import type { ConstructionExecutionPorts } from '../../construction/executor';
import type { PlanState } from '../../planning/plan-model';
import { createRemoteAssignmentStore } from '../assignment-store';
import { createRemoteInfrastructureStore } from './store';
import type { RemoteOutpostDemand } from './model';
export interface RemoteInfrastructureExecutionPorts {
  clock(): number; guard(): boolean; admit(room: string): boolean;
  construction(room: string): ConstructionExecutionPorts;
}
interface Budget { rooms: number; entries: number; attempts: number }
/** Desired plans remain feature-owned; execution reuses shared construction with isolated progress scopes. */
export function createRemoteInfrastructureExecution(state: StatePort, home: string, ports: RemoteInfrastructureExecutionPorts) {
  const assignments = createRemoteAssignmentStore(state);
  return { run(demand: RemoteOutpostDemand, budget: Budget) {
    validateBudget(budget);
    const store = createRemoteInfrastructureStore(state,home,demand.room), record = store.read();
    const authorized = (room: string) => assignments.resolve(demand,ports.clock())?.home === home && record.generation === demand.generation
      && store.read().revision === record.revision && ports.admit(room);
    if (!ports.guard() || !authorized(demand.room)) return [];
    let remaining = { entries: budget.entries,attempts: budget.attempts };
    const results = [];
    for (const plan of rotate(record.plans,ports.clock())) {
      if (!roomBudgetAvailable(results.length,budget,remaining) || !ports.guard()) break;
      if (!authorized(plan.room)) continue;
      const guard = () => ports.guard() && authorized(plan.room);
      const result = roomCycle(state,home,demand.room,plan,store,ports,guard).advance(remaining,guard);
      results.push({ room: plan.room,...result });
      if ('result' in result) remaining = { entries: remaining.entries-result.result.decisions.length,attempts: remaining.attempts-result.result.attempts };
    }
    return results;
  } };
}
function roomCycle(state: StatePort, home: string, target: string, plan: PlanState, store: ReturnType<typeof createRemoteInfrastructureStore>,
  ports: RemoteInfrastructureExecutionPorts, guard: () => boolean) {
  const raw = ports.construction(plan.room);
  const wrapped = { observe: raw.observe,create: (entry: Parameters<typeof raw.create>[0]) => guard() ? raw.create(entry)
    : { status: 'not-owned' as const,reason: 'remote-authority-changed' } };
  const progress = createConstructionProgressStore(state,plan.room,framedIdentity(['remote',home,target,plan.room]));
  const readPlan = () => store.read().plans.find(value => value.room === plan.room) ?? { ...plan,revision: store.read().revision,entries: [] };
  return createStoredConstructionCycle(progress,readPlan,wrapped,{ types: constructionTypeOrder },ports.clock);
}
function rotate<T>(items: readonly T[], tick: number): T[] {
  const start = tick % Math.max(1,items.length);
  return [...items.slice(start),...items.slice(0,start)];
}
function validateBudget(budget: Budget): void {
  if (!Number.isSafeInteger(budget.rooms) || budget.rooms < 0 || budget.rooms > 64) throw new Error('Invalid remote construction room budget');
  if (![budget.entries,budget.attempts].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 10000)) throw new Error('Invalid remote construction budget');
}
function roomBudgetAvailable(count: number, budget: Budget, remaining: Omit<Budget,'rooms'>): boolean {
  return count < budget.rooms && remaining.entries > 0 && remaining.attempts > 0;
}
