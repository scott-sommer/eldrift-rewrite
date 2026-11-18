import type { RuntimeConfig } from '../config/model';
export interface ScoutPlanningClock {
  tick(): number; usedCpu(): number; tickLimit(): number; bucket(): number;
}
/** One home/tick allowance shared by recruitment and every unit's fallback selection. */
export function createScoutPlanningBudget(clock: ScoutPlanningClock) {
  let tick: number | undefined;
  const deadlines = new Map<string,number>();
  return (home: string, config: Readonly<RuntimeConfig>): (() => boolean) => {
    const now = clock.tick();
    if (now !== tick) { deadlines.clear(); tick = now; }
    if (!deadlines.has(home)) deadlines.set(home,clock.usedCpu()+config.scoutPlanCpuBudget);
    const deadline = Math.min(deadlines.get(home)!,clock.tickLimit()*config.backgroundCpuFraction);
    return () => config.backgroundEnabled && clock.bucket() >= config.minimumBucket && clock.usedCpu() < deadline;
  };
}
