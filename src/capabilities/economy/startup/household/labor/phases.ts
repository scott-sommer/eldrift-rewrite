import { natural, requireLabor } from './validation';
import type { HouseholdLaborJob, HouseholdLaborState } from './model';
export function validateLaborPhase(state: HouseholdLaborState, job: HouseholdLaborJob, through: number): void {
  if (state.phase === 'waiting' || state.phase === 'missed') { validateUnpicked(state,job,through); return; }
  requireLabor(through >= job.pickupAt);
  const last = Math.min(through,state.expiresAt!-1,state.stopAt!-1), opportunities = Math.max(0,last-state.workAt!+1);
  requireLabor(state.spent <= opportunities*state.rate);
  if (state.returnAt !== null) validateReturn(state,job,through);
  if (state.returned > 0) requireLabor(state.returnAt !== null && through >= state.returnAt);
  switch (state.phase) {
    case 'working': validateWorking(state,through); break;
    case 'returning': validateReturning(state,through); break;
    case 'complete': validateComplete(state,through); break;
    case 'expired': validateExpired(state,through); break;
  }
}
function validateUnpicked(state: HouseholdLaborState, job: HouseholdLaborJob, through: number): void {
  requireLabor(state.worker === null && state.rate === 0);
  requireLabor([state.cargo,state.picked,state.spent,state.returned,state.lost].every(value => value === 0));
  requireLabor([state.workAt,state.stopAt,state.returnAt,state.expiresAt].every(value => value === null));
  if (state.phase === 'waiting') requireLabor(state.doneAt === null && through < job.pickupAt);
  else requireLabor(state.doneAt === job.pickupAt && through >= job.pickupAt);
}
function validateReturn(state: HouseholdLaborState, job: HouseholdLaborJob, through: number): void {
  const lastWork = state.returnAt!-1-job.returnTicks;
  requireLabor(lastWork >= state.workAt! && lastWork < state.stopAt!);
  requireLabor(lastWork <= through && lastWork < state.expiresAt!);
  if (lastWork < state.stopAt!-1) requireLabor(state.spent === state.picked);
  requireLabor(state.spent <= (lastWork-state.workAt!+1)*state.rate);
}
function validateWorking(state: HouseholdLaborState, through: number): void {
  requireLabor(state.cargo > 0 && state.returned === 0 && state.lost === 0);
  requireLabor(state.returnAt === null && state.doneAt === null);
  requireLabor(through < state.stopAt!-1 && through < state.expiresAt!);
}
function validateReturning(state: HouseholdLaborState, through: number): void {
  requireLabor(state.returnAt !== null && state.doneAt === null && state.lost === 0);
  requireLabor(through < state.expiresAt!);
  requireLabor(through < state.returnAt! || state.cargo > 0);
}
function validateComplete(state: HouseholdLaborState, through: number): void {
  requireLabor(state.cargo === 0 && state.lost === 0 && state.returnAt !== null);
  requireLabor(state.doneAt !== null && natural(state.doneAt));
  requireLabor(state.doneAt! >= state.returnAt! && state.doneAt! <= through && state.doneAt! < state.expiresAt!);
  if (state.spent === state.picked) requireLabor(state.doneAt === state.returnAt);
}
function validateExpired(state: HouseholdLaborState, through: number): void {
  requireLabor(state.cargo === 0 && state.doneAt === state.expiresAt && state.doneAt! <= through);
  if (state.returnAt === null) requireLabor(state.returned === 0 && state.expiresAt! < state.stopAt!);
  if (state.lost === 0) requireLabor(state.returnAt !== null && state.returnAt >= state.expiresAt!);
}
