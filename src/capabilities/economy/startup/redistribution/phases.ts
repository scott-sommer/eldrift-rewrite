import type { StartupRedistributionState, StartupRedistributionTrip } from './model';
export function validateRedistributionPhase(state: StartupRedistributionState, trip: StartupRedistributionTrip, through: number): void {
  if (state.phase === 'waiting' || state.phase === 'missed') { validateUnpicked(state,trip,through); return; }
  validatePicked(state,trip,through);
  switch (state.phase) {
    case 'carrying': requireState(state.cargo > 0 && state.doneAt === null && through < state.expiresAt!); break;
    case 'complete': validateComplete(state); break;
    case 'lost': requireState(state.cargo === 0 && state.lost > 0 && state.doneAt === state.expiresAt); break;
  }
}
function validatePicked(state: StartupRedistributionState, trip: StartupRedistributionTrip, through: number): void {
  requireState(state.picked > 0 && through >= trip.pickupAt);
  requireState(state.arrivalAt === trip.pickupAt+1+trip.loadedTicks && state.expiresAt !== null && state.expiresAt > trip.pickupAt);
  if (state.delivered > 0) requireState(through >= state.arrivalAt!);
}
function validateComplete(state: StartupRedistributionState): void {
  requireState(state.cargo === 0 && state.lost === 0 && state.delivered === state.picked);
  requireState(state.doneAt !== null && state.doneAt >= state.arrivalAt! && state.doneAt < state.expiresAt!);
}
function validateUnpicked(state: StartupRedistributionState, trip: StartupRedistributionTrip, through: number): void {
  requireState(state.picked === 0 && state.cargo === 0 && state.arrivalAt === null && state.expiresAt === null);
  if (state.phase === 'waiting') requireState(state.doneAt === null && through < trip.pickupAt);
  else requireState(state.doneAt === trip.pickupAt && through >= trip.pickupAt);
}
function requireState(valid: boolean): void { if (!valid) throw new Error('Invalid redistribution checkpoint phase'); }
