import { runEnumerationCycle } from './enumeration-cycle';
import { runPlanningCycle } from './planning-cycle';
import type { PlanningCyclePorts } from './planning-cycle';
import type { createEnumerationStore } from './enumeration-store';
import type { EnumerationOptions } from './candidate-enumeration';
import type { PlanningJobInput } from './planning-job-model';
export interface EnumeratedPlanningPorts extends PlanningCyclePorts {
  candidates: ReturnType<typeof createEnumerationStore>;
}
/** Enumeration and scoring have separate work budgets, sharing one caller-owned CPU guard. */
export function runEnumeratedPlanningCycle(
  ports: EnumeratedPlanningPorts, options: EnumerationOptions, input: Omit<PlanningJobInput, 'source'>,
  tick: number, budgets: { attempts: number; steps: number }, canContinue: () => boolean = () => true,
) {
  for (const value of [tick, budgets.attempts, budgets.steps]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid planning cycle budget');
  }
  const enumeration = runEnumerationCycle(ports.candidates, options, budgets.attempts, canContinue);
  if (enumeration.status === 'conflict') return { phase: 'enumeration' as const, status: 'conflict' as const };
  if (!enumeration.done) return { phase: 'enumeration' as const, status: 'pending' as const, attempts: enumeration.attempts };
  const result = runPlanningCycle(ports, { ...input, source: enumeration.source }, tick, budgets.steps, canContinue);
  return { ...result, phase: 'scoring' as const, attempts: enumeration.attempts };
}
