import type { FeatureContext, RoomFeature } from './runtime-model';
import { runEnumeratedPlanningCycle } from '../features/planning/enumerated-planning-cycle';
import type { EnumeratedPlanningPorts } from '../features/planning/enumerated-planning-cycle';
import type { EnumerationOptions } from '../features/planning/candidate-enumeration';
import type { PlanningJobInput } from '../features/planning/planning-job-model';
export interface PlanningWork {
  ports: EnumeratedPlanningPorts;
  enumeration: EnumerationOptions;
  input: Omit<PlanningJobInput, 'source'>;
}
export interface PlanningFeaturePorts {
  enabled(context: FeatureContext): boolean;
  prepare(context: FeatureContext, canContinue: () => boolean): PlanningWork | undefined;
  budget(context: FeatureContext): { cpu: number; attempts: number; steps: number };
  usedCpu(): number;
  tickLimit(): number;
  report(context: FeatureContext, result: ReturnType<typeof runEnumeratedPlanningCycle>): void;
}
/** Background admission is scheduler-owned; this guard cooperatively bounds work inside an admitted room. */
export function createPlanningFeature(ports: PlanningFeaturePorts): RoomFeature {
  return { id: 'planning', scope: 'owned', urgency: 'background', interval: 1,
    run(context) {
      if (!context.room.owned || !ports.enabled(context)) return;
      const budget = ports.budget(context), start = ports.usedCpu(), limit = ports.tickLimit();
      validateBudget(budget, start, limit);
      const deadline = Math.min(start + budget.cpu, limit * context.config.values.backgroundCpuFraction);
      const canContinue = () => ports.usedCpu() < deadline;
      if (!canContinue()) return;
      const work = ports.prepare(context, canContinue);
      if (!work || !canContinue()) return;
      const result = runEnumeratedPlanningCycle(work.ports, work.enumeration, work.input,
        context.world.tick, budget, canContinue);
      ports.report(context, result);
    } };
}
function validateBudget(budget: { cpu: number; attempts: number; steps: number }, used: number, limit: number): void {
  if (![budget.cpu, used, limit].every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid planning CPU budget');
  if (![budget.attempts, budget.steps].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid planning work budget');
}
