import { copyPlain } from '../../../core/plain-data';
import { spawnedActiveTicks } from '../../spawning/lifetime';
import type { StartupDeliveryInput } from './delivery-model';
import type { StartupSharedCommitments,StartupPaidCohort,StartupPaidWorker } from './shared-model';
const natural = (value: number) => Number.isSafeInteger(value) && value >= 0;
const text = (value: string) => typeof value === 'string' && value.length > 0 && value.length <= 240;
export function sharedSinkCapacity(shared: StartupSharedCommitments): number { return shared.cohorts.reduce((sum,cohort) => sum+cohort.sinkCapacity,0); }
export function validateSharedCommitments(input: StartupDeliveryInput): void {
  const shared = input.shared; if (shared === undefined) return;
  validateScope(shared,input);
  const names = new Set(input.project.spawning.requests.map(request => request.id)), sources = new Set<string>();
  for (const cohort of shared.cohorts) validateCohort(cohort,shared,names,sources);
  if (shared.freeCapacity > input.homeSink.capacity || input.homeSink.freeCapacity !== shared.freeCapacity-sharedSinkCapacity(shared)) throw new Error('Shared sink liability mismatch');
}
function validateCohort(cohort: StartupPaidCohort, scope: StartupSharedCommitments, names: Set<string>, sources: Set<string>): void {
  const identity = JSON.stringify([cohort.room,cohort.source]);
  if (cohort.home !== scope.home || sources.has(identity) || cohort.source === scope.source) throw new Error('Shared cohort identity mismatch');
  sources.add(identity);
  validateApproval(cohort,scope);
  if (!Array.isArray(cohort.workers) || !cohort.workers.length || cohort.workers.length > 64) throw new Error('Invalid shared worker bound');
  for (const worker of cohort.workers) validateWorker(worker,cohort,scope,names);
  const maximum = cohort.workers.reduce((sum,worker) => sum+worker.capacity,0)*(scope.horizon+1);
  if (cohort.sinkCapacity !== maximum) throw new Error('Shared capacity envelope mismatch');
}
function validateWorker(worker: StartupPaidWorker, cohort: StartupPaidCohort, scope: StartupSharedCommitments, names: Set<string>): void {
  if (![worker.request,worker.owner].every(text) || names.has(worker.request)) throw new Error('Shared worker identity mismatch');
  names.add(worker.request);
  if (![worker.startAt,worker.activeAt,worker.expiresAt,worker.retireAt,worker.capacity].every(natural)) throw new Error('Invalid shared worker clocks');
  if (!Array.isArray(worker.body) || !worker.body.length || worker.body.some(part => !['move','work','carry'].includes(part))) throw new Error('Unsupported shared body');
  validateLife(worker,cohort,scope);
  if (worker.capacity !== worker.body.filter(part => part === 'carry').length*50) throw new Error('Shared carry capacity mismatch');
}

function validateScope(shared: StartupSharedCommitments, input: StartupDeliveryInput): void {
  if (!shared || shared.home !== input.project.spawning.room || shared.horizon !== input.project.spawning.cash.horizon) throw new Error('Shared home/horizon mismatch');
  if (![shared.home,shared.room,shared.source,shared.endpoint].every(text) || ![shared.observedAt,shared.horizon,shared.freeCapacity].every(natural)) throw new Error('Invalid shared scope');
  if (!Array.isArray(shared.cohorts) || shared.cohorts.length < 1 || shared.cohorts.length > 16) throw new Error('Invalid shared cohort bound');
}
function validateApproval(cohort: StartupPaidCohort, scope: StartupSharedCommitments): void {
  if (![cohort.home,cohort.room,cohort.source,cohort.endpoint].every(text) || ![cohort.generation,cohort.observedAt,cohort.approvedAt,cohort.sinkCapacity].every(natural)) throw new Error('Invalid shared cohort');
  if (cohort.generation < 1 || cohort.observedAt > cohort.approvedAt || cohort.approvedAt > scope.observedAt) throw new Error('Invalid shared approval clock');
}
function validateLife(worker: StartupPaidWorker, cohort: StartupPaidCohort, scope: StartupSharedCommitments): void {
  if (worker.startAt < cohort.observedAt || worker.startAt > scope.observedAt || worker.activeAt !== worker.startAt+worker.body.length*3) throw new Error('Unpaid shared worker');
  if (worker.expiresAt !== worker.activeAt+spawnedActiveTicks(worker.body) || worker.retireAt > worker.expiresAt || worker.retireAt <= scope.observedAt+scope.horizon) throw new Error('Shared replacement enters horizon');
}

/** JSON wire property order is not part of a paid cohort identity; ordered body/worker arrays remain meaningful. */
export function sharedCohortIdentity(cohorts: readonly StartupPaidCohort[]): string {
  return JSON.stringify(copyPlain(cohorts),(_key,value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b))) : value);
}
