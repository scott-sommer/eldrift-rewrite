import type { StartupPlanningInspection } from '../../../../features/remotes/startup/planning/runner';
import { createStartupApprovals } from '../../../../features/remotes/startup/approvals/catalog';
import { createStartupSelections } from '../../../../features/remotes/startup/selection-store';
import { createStartupPlanningJob } from '../../../../features/remotes/startup/planning/runner';
import { decodeStartupPlanningInput } from '../../../../features/remotes/startup/planning/input';
import { observeStartupBirths } from '../../../../adapters/screeps/startup-birth-observation';
import { createNativeStartupExecutionBinding } from '../execution-binding';
import { nativeRemoteRoute } from '../../native-route';
import { nativeRemoteTraversalFor } from '../../management/policy';
import { startupEconomicPolicy } from './policy';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RemoteFleetProfile } from '../../../../features/remotes/fleet/model';
import type { RuntimeConfig } from '../../../../config/model';
import type { StartupPlanningContext } from '../../../../features/remotes/startup/planning/model';
import type { CompleteStartupTravel } from '../../../../features/remotes/startup/selection-model';
export function approvedEconomicContext(state: StatePort, profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>, readApproval: EconomicApprovalReader = profile => matchingEconomicApproval(state,profile)) {
  const approval = readApproval(profile); if (!approval) return undefined;
  return executionContext(state,approval.job,approval.quote,approval.rooms,config);
}
export function matchingEconomicApproval(state: StatePort, profile: Readonly<RemoteFleetProfile>) {
  return createStartupApprovals(state,profile.home).read().approvals.find(entry => entry.job.room === profile.room && entry.job.source === profile.source && entry.job.generation === profile.generation);
}
export function pendingEconomicContext(state: StatePort, profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>, guard: () => boolean) {
  const planning = createStartupPlanningJob(state,profile.home).inspect(), job = planning.record.job;
  if (!job || job.room !== profile.room || job.source !== profile.source || job.generation !== profile.generation) return undefined;
  const selection = createStartupSelections(state,profile.home).read().selections.find(entry => entry.generation === job.generation && entry.binding === job.binding && entry.selectedAt === job.observedAt && entry.quote.plan.source === job.source && entry.quote.plan.room === job.room);
  if (!selection) return undefined;
  const username = Game.rooms[profile.home]?.controller?.owner?.username; if (!username) return undefined;
  const route = nativeRemoteRoute(state,profile.home,profile.room,nativeRemoteTraversalFor(username,config),config.remoteMaximumRouteRooms,false,guard);
  if (!route?.allowedRooms || !guard()) return undefined;
  return { ...executionContext(state,job,selection.quote,route.allowedRooms,config),planning };
}
function executionContext(state: StatePort, job: StartupPlanningContext & { input: import('../../../../features/remotes/startup/planning/model').StartupPlanningInput }, quote: CompleteStartupTravel, rooms: readonly string[], config: Readonly<RuntimeConfig>) {
  const input = decodeStartupPlanningInput(job.input), policy = startupEconomicPolicy(config);
  const { room,source,generation,binding,observedAt,expiresAt } = job;
  const query = { room,source,generation,binding,observedAt,expiresAt,tick: Game.time,input };
  return { query,quote,rooms: [...rooms],policy,binding: createNativeStartupExecutionBinding(state)(quote.plan,rooms,config,policy) ?? '',tick: Game.time,births: observeStartupBirths(input.project.spawning.requests) };
}
export type EconomicExecutionContext = NonNullable<ReturnType<typeof approvedEconomicContext>> & { planning?: StartupPlanningInspection };

export type EconomicApprovalReader = (profile: Readonly<RemoteFleetProfile>) => ReturnType<typeof matchingEconomicApproval>;
