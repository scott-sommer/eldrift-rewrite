import { bodyCost } from '../../../../spawning/body';
import { laborBody } from './body';
import type { HouseholdLaborInput, HouseholdLaborJob, HouseholdLaborWorker } from './model';
export const natural = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;
const text = (value: string): boolean => typeof value === 'string' && value.length > 0 && value.length <= 240;
export function validateLabor(input: HouseholdLaborInput): void {
  if (!natural(input.horizon) || input.horizon > 10000 || input.jobs.length > 64 || new Set(input.jobs.map(job => job.id)).size !== input.jobs.length) throw new Error('Invalid household labor limits');
  for (const job of input.jobs) validateJob(job,input.horizon);
}
function validateJob(job: HouseholdLaborJob, horizon: number): void {
  if (!text(job.id) || !text(job.request) || !['build','repair','upgrade'].includes(job.kind)) throw new Error('Invalid household labor identity');
  if (![job.pickupAt,job.outboundTicks,job.workTicks,job.returnTicks,job.energy].every(natural)) throw new Error('Invalid household labor bounds');
  validateService(job,horizon);
}
function validateService(job: HouseholdLaborJob, horizon: number): void {
  if (job.pickupAt > horizon || job.outboundTicks > 1500 || job.returnTicks > 1500 || job.workTicks < 1 || job.workTicks > 1500 || job.energy < 1 || job.energy > 2500) throw new Error('Invalid household labor service');
}
export function laborWorker(worker: HouseholdLaborWorker, job: HouseholdLaborJob, tick: number) {
  validateWorkerShape(worker);
  const { birth,body } = worker, facts = laborBody(body,job.kind);
  if (birth.request !== job.request || ![birth.startAt,birth.activeAt,birth.cost].every(natural) || birth.activeAt !== birth.startAt+body.length*3 || birth.cost !== bodyCost(body)) throw new Error('Invalid paid household labor birth');
  const expiresAt = birth.activeAt+facts.life;
  return facts.capacity && facts.rate && birth.activeAt <= tick && tick < expiresAt ? { capacity: facts.capacity,expiresAt,rate: facts.rate } : undefined;
}
export function accepted(amount: number, maximum: number): number {
  if (!natural(amount) || amount > maximum) throw new Error('Invalid household labor effect');
  return amount;
}

export function laborIdentity(input: HouseholdLaborInput): string {
  return JSON.stringify([input.horizon,input.jobs.map(job => [job.id,job.request,job.kind,job.pickupAt,job.outboundTicks,job.workTicks,job.returnTicks,job.energy])]);
}
export function requireLabor(valid: boolean): void { if (!valid) throw new Error('Invalid household labor checkpoint'); }

function validateWorkerShape(worker: HouseholdLaborWorker): void {
  if (Object.keys(worker).sort().join() !== 'birth,body') throw new Error('Invalid labor worker fields');
  if (Object.keys(worker.birth).sort().join() !== 'activeAt,cost,request,spawn,startAt' || !text(worker.birth.spawn)) throw new Error('Invalid labor birth fields');
}
