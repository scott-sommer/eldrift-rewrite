import { requireCheckpoint } from './validation';
import type { StartupDeliveryInput } from '../delivery-model';
import type { StartupProjectCheckpoint } from './project-model';
export function validateProjectHouseholdLinks(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  if (!input.household) return;
  const household = saved.household!;
  const picked = household.redistribution.trips.reduce((sum,trip) => sum+trip.picked,0);
  const changes = input.homeSink.changes.reduce((sum,flow) => sum+(flow.kind === 'release' ? 1 : -1)*flow.energy*occurrences(flow,saved.tick-1),0);
  requireCheckpoint(saved.sink.free === input.homeSink.freeCapacity+changes+picked-saved.sink.acceptedEnergy);
  requireCheckpoint(household.endpointReceivedEnergy === saved.sourceAccounting.state.deliveredEnergy);
  requireCheckpoint((['birthEnergy','homeConstructionEnergy','upkeepEnergy'] as const).every(key => saved.houseAccounting.state[key] === saved.sourceAccounting.state[key]));
}
function occurrences(flow: { firstTick: number; interval: number | null; occurrences: number }, through: number): number {
  if (flow.interval === null) return through >= flow.firstTick ? 1 : 0;
  return Math.max(0,Math.min(flow.occurrences,Math.floor((through-flow.firstTick)/flow.interval)+1));
}
