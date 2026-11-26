import type { SpawnRequest } from '../../../../capabilities/spawning/request';
import type { StartupTravelPlan } from '../travel-model';
import { restoreStartupProject } from '../../../../capabilities/economy/startup/project';
import { assessStartupProject, validateStartupReturnPolicy } from '../../../../capabilities/economy/startup/assessment';
import { sameSpawnPlacement } from '../../../../capabilities/spawning/placement';
import { natural, object, room } from '../../assignment-validation';
import { remoteFleetIdentity } from '../../fleet/identity';
import { validPlanningJob } from '../planning/validation';
import { decodeStartupPlanningInput } from '../planning/input';
import { validCompleteStartupTravel } from '../selection-validation';
import type { StartupApproval } from './model';
export function completedStartupApproval(approval: StartupApproval) {
  const input = decodeStartupPlanningInput(approval.job.input), project = restoreStartupProject(input,approval.job.checkpoint);
  return project.advance(0).done ? project.result() : undefined;
}
export function assessStartupApproval(approval: StartupApproval) {
  const result = completedStartupApproval(approval); if (!result) return undefined;
  const input = decodeStartupPlanningInput(approval.job.input), participants = [...input.project.workers,...input.couriers].map(worker => worker.request);
  return assessStartupProject(result,input.project.spawning.cash.horizon,approval.policy,participants,input.household?.labor?.jobs);
}
export function validStartupApproval(value: unknown, home: string, clock: number): value is StartupApproval {
  if (!object(value) || Object.keys(value).length !== 5 || !validPlanningJob(value.job,home,clock) || !validCompleteStartupTravel(value.quote,home)) return false;
  const approval = value as unknown as StartupApproval;
  if (!validWindow(approval,clock)) return false;
  if (!validRooms(approval) || approval.job.room !== approval.quote.plan.room || approval.job.source !== approval.quote.plan.source) return false;
  return coherentApproval(approval,home);
}
function validRooms(approval: StartupApproval): boolean {
  const rooms = approval.rooms;
  return Array.isArray(rooms) && rooms.length <= 64 && rooms.every(room) && new Set(rooms).size === rooms.length && rooms.includes(approval.quote.plan.home) && rooms.includes(approval.job.room);
}
function coherentApproval(approval: StartupApproval, home: string): boolean {
  try {
    validateStartupReturnPolicy(approval.policy);
    if (Object.keys(approval.policy).length !== 4 || !cohortMatches(approval,home) || !timingMatches(approval)) return false;
    return assessStartupApproval(approval)?.accepted === true;
  } catch { return false; }
}
function cohortMatches(approval: StartupApproval, home: string): boolean {
  const input = decodeStartupPlanningInput(approval.job.input), plan = approval.quote.plan;
  const participants = new Set([...input.project.workers,...input.couriers].map(worker => worker.request));
  return input.project.spawning.requests.filter(request => participants.has(request.id)).every(request => {
    const identity = remoteFleetIdentity(request.owner);
    if (!identity || identity.home !== home || identity.room !== approval.job.room || identity.source !== approval.job.source) return false;
    return requestMatchesPlan(request,plan,identity.kind,home);
  });
}

function validWindow(approval: StartupApproval, clock: number): boolean {
  return natural(approval.approvedAt) && approval.approvedAt >= approval.job.observedAt && approval.approvedAt <= Math.min(clock,approval.job.expiresAt);
}
function requestMatchesPlan(request: SpawnRequest, plan: StartupTravelPlan, kind: 'miner' | 'courier', home: string): boolean {
  return !request.boost && request.room === home && (request.home ?? home) === home && JSON.stringify(request.body) === JSON.stringify(plan[kind])
    && sameSpawnPlacement(request.placement,{ spawn: plan.spawn.id,exit: plan.spawn.exit });
}

function timingMatches(approval: StartupApproval): boolean {
  const input = decodeStartupPlanningInput(approval.job.input), legs = new Map(approval.quote.legs.map(leg => [leg.kind,leg.ticks]));
  return input.project.workers.every(worker => worker.travelTicks >= legs.get('miner-approach')! && worker.retireTicks >= legs.get('miner-return')!+1)
    && input.couriers.every(worker => courierTimingMatches(worker,legs));
}
function courierTimingMatches(worker: import('../../../../capabilities/economy/startup/delivery-model').StartupCourier, legs: ReadonlyMap<string,number>): boolean {
  return (worker.initialOutboundTicks ?? worker.outboundTicks) >= legs.get('courier-approach')! && worker.outboundTicks >= legs.get('courier-empty')!
    && worker.returnTicks >= legs.get('courier-loaded')! && worker.retireTicks >= legs.get('courier-loaded')!+(worker.deliveryTicks ?? 1);
}
