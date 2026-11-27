import type { RemoteFleetProfile } from '../fleet/model';
import { spawnedActiveTicks } from '../../../capabilities/spawning/lifetime';
import type { StartupScheduledBirth } from '../../../capabilities/economy/startup/spawn-model';
import type { StartupPaidWorker } from '../../../capabilities/economy/startup/shared-model';
import type { PaidWorkerObservation,PaidCohortEvidence,PaidCohortScope } from './paid-cohorts';
export function qualifyPaidWorker(worker: PaidWorkerObservation, evidence: PaidCohortEvidence, expected: readonly StartupScheduledBirth[], scope: PaidCohortScope, tick: number): StartupPaidWorker | undefined {
  const context = paidContext(worker,evidence,expected); if (!context) return undefined;
  const { profile,paid,observed } = context;
  if (!healthy(worker,profile.body) || !matchingBirth(worker,evidence,paid,observed)) return undefined;
  const body = worker.body.map(part => part.type), expiresAt = observedExpiry(worker,observed.activeAt,tick);
  if (expiresAt === undefined) return undefined;
  const threshold = retirementThreshold(evidence,profile); if (threshold === undefined) return undefined;
  const retireAt = expiresAt-threshold;
  if (observed.startAt > scope.observedAt || retireAt <= scope.observedAt+scope.horizon) return undefined;
  return { request: worker.name,owner: worker.owner,body,startAt: observed.startAt,activeAt: observed.activeAt,expiresAt,retireAt,capacity: body.filter(part => part === 'carry').length*50 };
}
function healthy(worker: PaidWorkerObservation, body: readonly string[]): boolean {
  return worker.body.every(part => part.hits === 100 && part.boost === null) && JSON.stringify(worker.body.map(part => part.type)) === JSON.stringify(body);
}
function matchingBirth(worker: PaidWorkerObservation, evidence: PaidCohortEvidence, expected: StartupScheduledBirth, observed: PaidCohortEvidence['births'][number]): boolean {
  const epoch = evidence.approval.job.observedAt;
  return observed.owner === worker.owner && observed.home === evidence.approval.quote.plan.home
    && JSON.stringify(observed.body) === JSON.stringify(worker.body.map(part => part.type))
    && observed.startAt === expected.startAt+epoch && observed.activeAt === expected.activeAt+epoch;
}

function observedExpiry(worker: PaidWorkerObservation, activeAt: number, tick: number): number | undefined {
  const expiresAt = activeAt+spawnedActiveTicks(worker.body.map(part => part.type));
  return worker.spawning || tick+Number(worker.ticksToLive) === expiresAt ? expiresAt : undefined;
}

function retirementThreshold(evidence: PaidCohortEvidence, profile: RemoteFleetProfile): number | undefined {
  const kind = profile.kind === 'miner' ? 'miner-return' : 'courier-loaded';
  const leg = evidence.approval.quote.legs.find(leg => leg.kind === kind);
  return leg ? Math.max(profile.retireTicks,leg.ticks+1) : undefined;
}

function paidContext(worker: PaidWorkerObservation, evidence: PaidCohortEvidence, expected: readonly StartupScheduledBirth[]) {
  const profile = evidence.profiles.find(profile => profile.owner === worker.owner), paid = expected.find(birth => birth.request === worker.name);
  const observed = evidence.births.find(birth => birth.request === worker.name);
  if (!profile || !paid || !observed || !profile.desired) return undefined;
  return { profile,paid,observed };
}
