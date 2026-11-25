import type { StartupCashFlow } from './cash-model';
export function startupFlowDue(flow: StartupCashFlow, tick: number): boolean {
  if (tick < flow.firstTick) return false;
  if (flow.interval === null) return tick === flow.firstTick;
  const age = tick-flow.firstTick;
  return age%flow.interval === 0 && age/flow.interval < flow.occurrences;
}

/** Count a validated schedule without iterating through elapsed frames. */
export function startupFlowCount(flow: Pick<StartupCashFlow,'firstTick' | 'interval' | 'occurrences'>, from: number, through: number): number {
  if (from > through) return 0;
  if (flow.interval === null) return from <= flow.firstTick && flow.firstTick <= through ? 1 : 0;
  const first = Math.max(0,Math.ceil((from-flow.firstTick)/flow.interval));
  const last = Math.min(flow.occurrences-1,Math.floor((through-flow.firstTick)/flow.interval));
  return Math.max(0,last-first+1);
}
