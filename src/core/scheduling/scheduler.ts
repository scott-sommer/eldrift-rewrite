import type { Failure, ScheduleEntry, ScheduledWork, SchedulerBudget, SchedulerPorts } from './model';
import { dueOrder, prepare } from './queue';
export function createScheduler(work: readonly ScheduledWork[], ports: SchedulerPorts, startTick: number) {
  const entries = prepare(work, startTick);
  function execute(entry: ScheduleEntry, tick: number, failures: Failure[]): void {
    try {
      entry.work.run();
    } catch (error) {
      const failure = { id: entry.work.id, tick, error, ...(entry.work.room === undefined ? {} : { room: entry.work.room }) };
      failures.push(failure);
      try { ports.reportFailure(failure); } catch { /* Returned failures remain available to the caller. */ }
    } finally {
      entry.due = tick + entry.work.interval;
    }
  }
  return {
    run(budget: SchedulerBudget): readonly Failure[] {
      const failures: Failure[] = [];
      const eligible = entries.filter(entry => entry.due <= budget.tick).sort(dueOrder);
      for (const entry of eligible) {
        if (!canRun(entry, budget, ports.usedCpu())) continue;
        execute(entry, budget.tick, failures);
      }
      return failures;
    },
  };
}
function canRun(entry: ScheduleEntry, budget: SchedulerBudget, used: number): boolean {
  if (used >= budget.tickLimit) return false;
  if (entry.work.urgency === 'urgent') return true;
  return budget.backgroundEnabled && budget.bucket >= budget.minimumBucket
    && used < budget.tickLimit * budget.backgroundCpuFraction;
}

