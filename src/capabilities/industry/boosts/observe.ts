import type { BoostJob, BoostStep, BoostUnit } from './model';
import { terminalBoost } from './model';
export function boostedParts(unit: BoostUnit,step: BoostStep): number {
  return unit.body.filter(part => part.type === step.part && part.boost === step.resource && part.hits > 0).length;
}
export function boostStep(job: BoostJob): BoostStep | null { return job.request.steps.find((step,index) => (job.observed[index] ?? 0) < step.count) ?? null; }
/** Native body state is persistent evidence. API acceptance alone never completes a request. */
export function observeBoostJob(job: BoostJob,unit: BoostUnit | null,tick: number): void {
  if (terminalBoost(job) || job.attempt?.tick === tick) return;
  if (!unit || !sameUnit(job,unit)) { finish(job,'failed','unit-identity-lost'); return; }
  job.observed = job.request.steps.map(step => boostedParts(unit,step));
  job.attempt = null;
  if (job.cancelRequested) { finish(job,'cancelled','caller-cancelled'); return; }
  if (!boostStep(job)) { finish(job,'confirmed',null); return; }
  if (tick >= job.request.expiresAt) { finish(job,'expired','deadline'); return; }
  job.status = 'pending';
}
export function sameUnit(job: BoostJob,unit: BoostUnit): boolean {
  const request = job.request;
  return unit.id === request.unit && unit.name === request.name && unit.owner === request.owner && unit.home === request.home;
}
export function finish(job: BoostJob,status: 'confirmed' | 'cancelled' | 'failed' | 'expired',reason: string | null): void {
  job.status = status; job.reason = reason; job.attempt = null;
}
export function missingBoostParts(job: BoostJob,unit: BoostUnit,step: BoostStep): number | null {
  const missing = step.count-boostedParts(unit,step);
  if (missing <= 0) return 0;
  const eligible = unit.body.filter(part => part.type === step.part && part.boost === null);
  if (eligible.some(part => part.hits <= 0) || eligible.length < missing) return null;
  return missing;
}
