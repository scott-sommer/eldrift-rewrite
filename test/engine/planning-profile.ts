import type { createPlanningJobStore } from '../../src/features/planning/planning-job-store';
import type { createPlanStore } from '../../src/features/planning/plan-store';
interface Metric { calls: number; total: number; maximum: number }
export function measure<Args extends unknown[], Result>(name: string, action: (...args: Args) => Result) {
  return (...args: Args): Result => {
    const start = Game.cpu.getUsed();
    try { return action(...args); }
    finally {
      const elapsed = Game.cpu.getUsed() - start;
      const memory = Memory as Memory & { planningProfile?: Record<string, Metric> };
      const metrics = memory.planningProfile ??= {};
      const metric = metrics[name] ??= { calls: 0, total: 0, maximum: 0 };
      metric.calls++; metric.total += elapsed; metric.maximum = Math.max(metric.maximum, elapsed);
    }
  };
}
export function profileJobs(store: ReturnType<typeof createPlanningJobStore>) {
  return { read: measure('job.read', store.read), save: measure('job.save', store.save),
    clear: measure('job.clear', store.clear), finish: measure('job.finish', store.finish) };
}
export function profilePlans(store: ReturnType<typeof createPlanStore>) {
  return { read: measure('plan.read', store.read), commit: measure('plan.commit', store.commit) };
}
