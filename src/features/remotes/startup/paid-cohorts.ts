import { assessStartupProject } from '../../../capabilities/economy/startup/assessment';
import { remoteFleetIdentity } from '../fleet/identity';
import { completedStartupApproval } from './approvals/validation';
import { decodeStartupPlanningInput } from './planning/input';
import { qualifyPaidWorker } from './paid-worker';
import type { StartupPaidCohort,StartupSharedCommitments } from '../../../capabilities/economy/startup/shared-model';
import type { StartupObservedBirth } from './candidates/birth-admission';
import type { StartupApproval } from './approvals/model';
import type { RemoteFleetProfile } from '../fleet/model';
import type { BodyPart } from '../../../capabilities/spawning/body';
export interface PaidWorkerObservation {
  name: string; owner: string; spawning: boolean; ticksToLive: number | null;
  body: { type: BodyPart; hits: number; boost: string | null }[];
}
export interface PaidCohortEvidence { approval: StartupApproval; profiles: readonly RemoteFleetProfile[]; births: readonly StartupObservedBirth[]; current: boolean }
export type PaidCohortScope = Omit<StartupSharedCommitments,'cohorts'>;
export type PaidCohortReader = (room: string,source: string) => PaidCohortEvidence | undefined;
/** A bounded, conservative liability envelope. Historical payment never authorizes another birth. */
export function qualifyPaidCohorts(scope: PaidCohortScope, workers: readonly PaidWorkerObservation[], read: PaidCohortReader, tick: number): StartupSharedCommitments | undefined {
  if (scope.observedAt > tick || scope.horizon > 10000 || workers.length > 128) return undefined;
  const groups = groupWorkers(scope,workers); if (!groups || groups.size > 16) return undefined;
  const cohorts: StartupPaidCohort[] = [];
  for (const [key,group] of groups) {
    const [room,source] = JSON.parse(key) as [string,string], evidence = read(room,source);
    const cohort = evidence && qualifyGroup(scope,group,evidence,tick); if (!cohort) return undefined;
    cohorts.push(cohort);
  }
  cohorts.sort((a,b) => a.room.localeCompare(b.room) || a.source.localeCompare(b.source));
  return { ...scope,cohorts };
}
function qualifyGroup(scope: PaidCohortScope, group: readonly PaidWorkerObservation[], evidence: PaidCohortEvidence, tick: number): StartupPaidCohort | undefined {
  const { approval } = evidence, job = approval.job;
  if (!evidence.current || approval.approvedAt > scope.observedAt) return undefined;
  const births = paidBirths(approval); if (!births || !matchingGroup(group,evidence,births)) return undefined;
  const workers = group.map(worker => qualifyPaidWorker(worker,evidence,births,scope,tick)); if (workers.some(worker => !worker)) return undefined;
  const paid = workers as NonNullable<typeof workers[number]>[];
  const sinkCapacity = approval.quote.plan.endpoint.id === scope.endpoint ? paid.reduce((sum,worker) => sum+worker.capacity,0)*(scope.horizon+1) : 0;
  return { home: scope.home,room: job.room,source: job.source,generation: job.generation,observedAt: job.observedAt,approvedAt: approval.approvedAt,endpoint: approval.quote.plan.endpoint.id,sinkCapacity,workers: paid.sort((a,b) => a.request.localeCompare(b.request)) };
}

function groupWorkers(scope: PaidCohortScope, workers: readonly PaidWorkerObservation[]) {
  const groups = new Map<string,PaidWorkerObservation[]>();
  for (const worker of workers) {
    const identity = remoteFleetIdentity(worker.owner);
    if (!identity || identity.home !== scope.home) return undefined;
    if (identity.room === scope.room && identity.source === scope.source) continue;
    const key = JSON.stringify([identity.room,identity.source]), group = groups.get(key) ?? []; group.push(worker); groups.set(key,group);
  }
  return groups;
}

function paidBirths(approval: StartupApproval) {
  const input = decodeStartupPlanningInput(approval.job.input), result = completedStartupApproval(approval);
  if (!result) return undefined;
  const ids = new Set([...input.project.workers,...input.couriers].map(worker => worker.request));
  if (!assessStartupProject(result,input.project.spawning.cash.horizon,approval.policy,[...ids],input.household?.labor?.jobs).accepted) return undefined;
  const births = result.spawning.births.filter(birth => ids.has(birth.request));
  return births.length === ids.size ? births : undefined;
}
function matchingGroup(group: readonly PaidWorkerObservation[], evidence: PaidCohortEvidence, births: NonNullable<ReturnType<typeof paidBirths>>): boolean {
  const identity = remoteFleetIdentity(group[0]!.owner)!, job = evidence.approval.job;
  if (job.room !== identity.room || job.source !== identity.source || evidence.profiles.some(profile => profile.generation !== job.generation)) return false;
  if (group.length !== births.length || births.some(birth => !group.some(worker => worker.name === birth.request))) return false;
  return evidence.profiles.every(profile => group.filter(worker => worker.owner === profile.owner).length === profile.desired);
}
