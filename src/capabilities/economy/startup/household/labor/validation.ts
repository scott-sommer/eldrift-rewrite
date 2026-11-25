import { bodyCost } from '../../../../spawning/body';
import { spawnedActiveTicks } from '../../../../spawning/lifetime';
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
  const { birth,body } = worker, life = spawnedActiveTicks(body);
  if (birth.request !== job.request || ![birth.startAt,birth.activeAt,birth.cost].every(natural) || birth.activeAt !== birth.startAt+body.length*3 || birth.cost !== bodyCost(body)) throw new Error('Invalid paid household labor birth');
  const capacity = body.filter(part => part === 'carry').length*50, work = body.filter(part => part === 'work').length;
  const expiresAt = birth.activeAt+life;
  return capacity && work && birth.activeAt <= tick && tick < expiresAt ? { capacity,expiresAt,rate: work*(job.kind === 'build' ? 5 : 1) } : undefined;
}
export function accepted(amount: number, maximum: number): number {
  if (!natural(amount) || amount > maximum) throw new Error('Invalid household labor effect');
  return amount;
}
