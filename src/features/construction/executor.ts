import { copyPlain } from '../../persistence/plain-data';
import type { PlanEntry } from '../planning/plan-model';
import type { ConstructionObservation, ConstructionStatus } from './model';
import { constructionEligibility } from './eligibility';
import { mergeConstructionEntries } from './entries';
import { orderConstructionEntries } from './order';
import type { ConstructionOrderPolicy } from './order';
import { reservedConstructionObservation } from './reservations';
export type ConstructionAttempt = { status: 'created' | 'full' | 'invalid' | 'retry' | 'rcl' | 'not-owned'; reason: string };
export interface ConstructionExecutionPorts {
  observe(): ConstructionObservation;
  create(entry: PlanEntry): ConstructionAttempt;
}
export interface ConstructionExecutionBudget { entries: number; attempts: number; start?: number }
interface ExecutionDecision { entry: PlanEntry; status: ConstructionStatus | ConstructionAttempt['status']; reason: string }
/** Retained desired state is never mutated; successful requests reserve capacity even before engine visibility. */
export function runConstructionCycle(entries: readonly PlanEntry[], ports: ConstructionExecutionPorts,
  policy: ConstructionOrderPolicy, budget: ConstructionExecutionBudget, guard: () => boolean) {
  validateBudget(budget);
  const decisions: ExecutionDecision[] = [], reserved: PlanEntry[] = [];
  let attempts = 0;
  if (!guard()) return { attempts, created: 0, decisions, next: startingIndex(budget, 10001) };
  const initial = ports.observe();
  const ordered = orderConstructionEntries(mergeConstructionEntries(entries, new Set(Object.keys(initial.limits))), policy);
  const start = startingIndex(budget, ordered.length);
  for (const entry of ordered.slice(start, start + budget.entries)) {
    if (attempts >= budget.attempts || !guard()) break;
    const observed = reservedConstructionObservation(ports.observe(), reserved);
    const eligibility = constructionEligibility(entry, observed);
    if (eligibility.status !== 'eligible') { decisions.push({ entry, ...eligibility }); continue; }
    if (!guard()) break;
    attempts++;
    const result = ports.create(copyPlain(entry));
    if (result.status === 'created') reserved.push(entry);
    decisions.push({ entry, ...result });
    if (stopAfter(result)) break;
  }
  return { attempts, created: reserved.length, decisions: copyPlain(decisions), next: (start + decisions.length) % Math.max(1, ordered.length) };
}
function stopAfter(result: ConstructionAttempt): boolean { return result.status === 'full' || result.status === 'not-owned'; }
function validateBudget(budget: ConstructionExecutionBudget): void {
  if (![budget.entries, budget.attempts, (budget.start ?? 0)].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 10000)) {
    throw new Error('Invalid construction execution budget');
  }
}

function startingIndex(budget: ConstructionExecutionBudget, length: number): number {
  return (budget.start ?? 0) % Math.max(1, length);
}
