import type { StartupCashFlow } from './cash-model';
export function startupFlowDue(flow: StartupCashFlow, tick: number): boolean {
  if (tick < flow.firstTick) return false;
  if (flow.interval === null) return tick === flow.firstTick;
  const age = tick-flow.firstTick;
  return age%flow.interval === 0 && age/flow.interval < flow.occurrences;
}
