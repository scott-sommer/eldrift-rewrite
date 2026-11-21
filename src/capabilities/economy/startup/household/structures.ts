import type { StartupEnergyEvent } from '../energy/model';
import type { StartupRedistributionState } from '../redistribution/model';
import type { StartupHouseholdInput, StartupHouseholdCheckpoint } from './model';
/** Destination identity belongs to the declared trip; funding never chooses a new route implicitly. */
export function validateHouseholdStructures(input: StartupHouseholdInput): void {
  const layout = input.spawning.funding.energyLayout;
  if (!layout) {
    if (input.redistribution.trips.some(trip => trip.destination !== undefined)) throw new Error('Addressed household trip requires structure layout');
    return;
  }
  const points = new Set(layout.structures.map(point => point.id));
  if (input.redistribution.trips.some(trip => !trip.destination || !points.has(trip.destination))) throw new Error('Unknown household destination');
  const stock = layout.structures.reduce((sum,point) => sum+point.energy,0);
  if (input.endpointEnergy > input.spawning.cash.homeEnergy-stock) throw new Error('Household endpoint overlaps physical structure stock');
}
export function validateHouseholdStructureLinks(input: StartupHouseholdInput, saved: StartupHouseholdCheckpoint): void {
  if (!input.spawning.funding.energyLayout) return;
  const trips = new Map(input.redistribution.trips.map((trip,index) => [trip.id,{ trip,state: saved.redistribution.trips[index]! }]));
  const totals = new Map<string,number>();
  for (const event of saved.spawning.energy!.events) {
    if (event.kind !== 'deposit') continue;
    const item = trips.get(event.holder);
    if (!item || event.structure !== item.trip.destination) throw new Error('Household deposit destination mismatch');
    validateDepositClock(event,item.state);
    totals.set(event.holder,(totals.get(event.holder) ?? 0)+event.energy);
  }
  for (const [id,item] of trips) {
    if ((totals.get(id) ?? 0) !== item.state.delivered) throw new Error('Household structure delivery conservation');
  }
}
function validateDepositClock(event: StartupEnergyEvent, state: StartupRedistributionState): void {
  if (state.arrivalAt === null || state.expiresAt === null || event.tick < state.arrivalAt || event.tick >= state.expiresAt) throw new Error('Household deposit outside paid trip lifetime');
  if (state.doneAt !== null && event.tick > state.doneAt) throw new Error('Household deposit after trip completion');
}
