import { copyPlain } from '../../../../core/plain-data';
import { natural, redistributionIdentity } from './validation';
import { validateRedistributionPhase } from './phases';
import type { StartupRedistributionInput, StartupRedistributionCheckpoint, StartupRedistributionState, StartupRedistributionTrip } from './model';
export function restoreRedistribution(input: StartupRedistributionInput, value: StartupRedistributionCheckpoint): StartupRedistributionCheckpoint {
  const saved = copyPlain(value); validateHeader(input,saved);
  if (!Array.isArray(saved.trips) || saved.trips.length !== input.trips.length || !Array.isArray(saved.busy)) throw new Error('Invalid redistribution checkpoint shape');
  saved.trips.forEach((state,index) => validateState(state,input.trips[index]!,saved.through));
  validateOccupancy(input,saved); return saved;
}
function validateHeader(input: StartupRedistributionInput, saved: StartupRedistributionCheckpoint): void {
  if (saved.format !== 1 || saved.binding !== redistributionIdentity(input)) throw new Error('Invalid redistribution checkpoint binding');
  if (!Number.isSafeInteger(saved.through) || saved.through < -1 || saved.through > input.horizon) throw new Error('Invalid redistribution checkpoint clock');
  if (Object.keys(saved).sort().join() !== 'binding,busy,format,through,trips') throw new Error('Invalid redistribution checkpoint fields');
}
function validateState(state: StartupRedistributionState, trip: StartupRedistributionTrip, through: number): void {
  if (state.id !== trip.id || !['waiting','carrying','complete','missed','lost'].includes(state.phase)) throw new Error('Invalid redistribution checkpoint trip');
  if (![state.cargo,state.picked,state.delivered,state.lost].every(natural) || state.picked > trip.energy) throw new Error('Invalid redistribution checkpoint energy');
  if (state.picked !== state.cargo+state.delivered+state.lost) throw new Error('Redistribution checkpoint conservation');
  if (![state.arrivalAt,state.expiresAt,state.doneAt].every(value => value === null || natural(value))) throw new Error('Invalid redistribution checkpoint clock');
  if (state.doneAt !== null && state.doneAt > through) throw new Error('Future redistribution completion');
  validateRedistributionPhase(state,trip,through);
}
function validateOccupancy(input: StartupRedistributionInput, saved: StartupRedistributionCheckpoint): void {
  const expected = new Map<string,number>(), active: string[] = [];
  saved.trips.forEach((state,index) => {
    const trip = input.trips[index]!;
    if (state.phase === 'carrying') active.push(trip.request);
    if (state.phase === 'complete') expected.set(trip.request,Math.max(expected.get(trip.request) ?? 0,state.doneAt!+1+trip.returnTicks));
  });
  if (new Set(active).size !== active.length || saved.busy.length !== expected.size) throw new Error('Invalid redistribution worker occupancy');
  if (new Set(saved.busy.map(worker => worker.request)).size !== saved.busy.length) throw new Error('Duplicate redistribution worker');
  if (!saved.busy.every(worker => natural(worker.until) && expected.get(worker.request) === worker.until)) throw new Error('Invalid redistribution return clock');
}
