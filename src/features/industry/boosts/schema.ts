import type { StateSchema } from '../../../persistence/versioned-state';
import type { BoostJob, BoostRequest, BoostStep } from '../../../capabilities/industry/boosts/model';
import { boostIdentity, holdsBoostUnit, terminalBoost } from '../../../capabilities/industry/boosts/model';
export interface BoostState { cursor: number; processedAt: number; jobs: BoostJob[] }
function text(value: unknown,maximum = 200): value is string { return typeof value === 'string' && value.length > 0 && value.length <= maximum; }
function integer(value: unknown,minimum: number,maximum = Number.MAX_SAFE_INTEGER): boolean { return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum; }
function validStep(value: unknown): value is BoostStep {
  if (!value || typeof value !== 'object') return false;
  const step = value as BoostStep;
  return text(step.part,20) && text(step.resource,20) && integer(step.count,1,50);
}
function validSteps(value: unknown): value is BoostStep[] {
  if (!Array.isArray(value) || !value.length || value.length > 8 || !value.every(validStep)) return false;
  return new Set(value.map(step => step.part)).size === value.length && value.reduce((sum,step) => sum+step.count,0) <= 50;
}
export function validBoostRequest(value: unknown): value is BoostRequest {
  if (!value || typeof value !== 'object') return false;
  const request = value as BoostRequest;
  if (![request.id,request.owner,request.unit,request.name,request.home].every(item => text(item))) return false;
  if (!validSteps(request.steps)) return false;
  return integer(request.expiresAt,0,Number.MAX_SAFE_INTEGER-1) && typeof request.required === 'boolean' && (request.preferredLab === undefined || text(request.preferredLab));
}
function validAttempt(job: BoostJob): boolean {
  const value = job.attempt;
  if (value === null) return job.status !== 'issued';
  if (!attemptBinding(job)) return false;
  return job.status === 'issued' && integer(value.tick,0) && integer(value.before,0,50) && integer(value.count,1,50)
    && text(value.resource,20) && text(value.part,20) && (value.code === null || Number.isSafeInteger(value.code));
}
function attemptBinding(job: BoostJob): boolean {
  const attempt = job.attempt!;
  const step = job.request.steps.find(step => step.part === attempt.part && step.resource === attempt.resource);
  return job.lab !== null && !!step && attempt.before+attempt.count === step.count;
}
function validJobShape(job: BoostJob): boolean {
  if (!(job.lab === null || text(job.lab)) || !(job.reason === null || text(job.reason))) return false;
  return Array.isArray(job.observed) && job.observed.length === job.request.steps.length && job.observed.every(count => integer(count,0,50))
    && typeof job.cancelRequested === 'boolean' && typeof job.acknowledged === 'boolean';
}
function validOutcome(job: BoostJob): boolean {
  if (job.acknowledged && !terminalBoost(job)) return false;
  return job.status !== 'confirmed' || job.observed.every((count,index) => count >= job.request.steps[index]!.count);
}
function validJob(value: unknown): value is BoostJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as BoostJob;
  if (!validBoostRequest(job.request) || !['pending','issued','confirmed','cancelled','expired','failed'].includes(job.status)) return false;
  return validJobShape(job) && validOutcome(job) && validAttempt(job);
}
function unique(jobs: readonly BoostJob[]): boolean {
  const held = jobs.filter(holdsBoostUnit).map(job => job.request.unit), labs = jobs.flatMap(job => job.lab ? [job.lab] : []);
  return new Set(jobs.map(job => boostIdentity(job.request))).size === jobs.length && new Set(held).size === held.length && new Set(labs).size === labs.length;
}
export const boostSchema: StateSchema<BoostState> = {
  owner: 'industry',version: 1,initial: () => ({ cursor: 0,processedAt: -1,jobs: [] }),migrations: {},
  valid(value: unknown): value is BoostState {
    if (!value || typeof value !== 'object') return false;
    const state = value as BoostState;
    return integer(state.cursor,0,63) && integer(state.processedAt,-1) && Array.isArray(state.jobs) && state.jobs.length <= 64 && state.jobs.every(validJob) && unique(state.jobs);
  },
};
