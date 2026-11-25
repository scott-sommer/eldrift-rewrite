import { copyPlain } from '../../../../../core/plain-data';
import { StartupCheckpointCapacityError } from '../../checkpoints/capacity';
import { laborIdentity, laborWorker, natural, requireLabor } from './validation';
import { validateLaborPhase } from './phases';
import type { HouseholdLaborInput, HouseholdLaborCheckpoint, HouseholdLaborState, HouseholdLaborJob } from './model';
export function readLaborCheckpoint(input: HouseholdLaborInput, value: HouseholdLaborCheckpoint): HouseholdLaborCheckpoint {
  const saved = copyPlain(value);
  requireLabor(Object.keys(saved).sort().join() === 'binding,format,jobs,through');
  requireLabor(saved.format === 1 && saved.binding === laborIdentity(input));
  requireLabor(Number.isSafeInteger(saved.through) && saved.through >= -1 && saved.through <= input.horizon);
  requireLabor(Array.isArray(saved.jobs) && saved.jobs.length === input.jobs.length);
  saved.jobs.forEach((state,index) => validateState(state,input.jobs[index]!,saved.through));
  validateOccupancy(input,saved);
  if (JSON.stringify(saved).length > 262144) throw new StartupCheckpointCapacityError('Household labor checkpoint capacity');
  return saved;
}
function validateState(state: HouseholdLaborState, job: HouseholdLaborJob, through: number): void {
  requireLabor(Object.keys(state).sort().join() === 'cargo,doneAt,expiresAt,id,lost,phase,picked,rate,returnAt,returned,spent,stopAt,workAt,worker');
  requireLabor(state.id === job.id && ['waiting','working','returning','complete','missed','expired'].includes(state.phase));
  requireLabor([state.cargo,state.picked,state.spent,state.returned,state.lost,state.rate].every(natural));
  requireLabor(state.picked === state.cargo+state.spent+state.returned+state.lost);
  requireLabor([state.workAt,state.stopAt,state.returnAt,state.expiresAt,state.doneAt].every(value => value === null || natural(value)));
  if (state.picked > 0) validateWorker(state,job);
  else requireLabor(state.worker === null);
  validateLaborPhase(state,job,through);
}
function validateWorker(state: HouseholdLaborState, job: HouseholdLaborJob): void {
  requireLabor(state.worker !== null);
  const worker = laborWorker(state.worker!,job,job.pickupAt);
  requireLabor(worker !== undefined);
  requireLabor(state.picked <= Math.min(job.energy,worker!.capacity));
  requireLabor(state.rate === worker!.rate && state.expiresAt === worker!.expiresAt);
  requireLabor(state.workAt === job.pickupAt+1+job.outboundTicks);
  requireLabor(state.stopAt === state.workAt!+job.workTicks);
}
function validateOccupancy(input: HouseholdLaborInput, saved: HouseholdLaborCheckpoint): void {
  const workers = new Map<string,{ until: number; binding: string }>();
  const picked = saved.jobs.map((state,index) => ({ state,job: input.jobs[index]! })).filter(item => item.state.picked > 0).sort((a,b) => a.job.pickupAt-b.job.pickupAt);
  for (const { state,job } of picked) {
    const previous = workers.get(job.request), worker = state.worker!, birth = worker.birth;
    const binding = JSON.stringify([birth.request,birth.spawn,birth.startAt,birth.activeAt,birth.cost,worker.body]);
    if (previous) requireLabor(job.pickupAt > previous.until && binding === previous.binding);
    workers.set(job.request,{ until: state.doneAt ?? saved.through,binding });
  }
}
