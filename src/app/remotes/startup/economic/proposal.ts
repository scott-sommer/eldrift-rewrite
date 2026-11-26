import { createNativeStartupGeometry } from '../native-geometry';
import { createNativeStartupTravel } from '../travel/native';
import { createNativeStartupProjection } from '../projection/native';
import { defaultMiningRepairPolicy } from '../../../../capabilities/mining/repair-policy';
import { nativeRemoteTraversalFor } from '../../management/policy';
import { createNativeStartupExecutionBinding } from '../execution-binding';
import { createStartupSelections } from '../../../../features/remotes/startup/selection-store';
import { createStartupPlanningJob } from '../../../../features/remotes/startup/planning/runner';
import { proposeEconomicBirths } from './proposals';
import { startupEconomicPolicy } from './policy';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RemoteFleetProfile } from '../../../../features/remotes/fleet/model';
import type { RuntimeConfig } from '../../../../config/model';
import type { StartupStructures } from '../model';
/** Observe and freeze a future cohort; no queue publication or spending authority. */
export function prepareEconomicProposal(state: StatePort, structures: StartupStructures, profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>, guard: () => boolean) {
  const plan = createNativeStartupGeometry(state)(profile); if (!plan || !guard()) return undefined;
  const username = Game.rooms[profile.home]?.controller?.owner?.username; if (!username) return undefined;
  const quote = createNativeStartupTravel(state,structures,{ maximumRooms: config.remoteMaximumRouteRooms,maximumOps: config.remoteMaximumPathOps })({ target: { home: plan.home,room: plan.room,source: plan.source,station: plan.station,endpoint: plan.endpoint.id,username,tick: Game.time },spawn: plan.spawn.id,exit: plan.spawn.exit,collection: plan.collection,deposit: plan.endpoint.deposit,miner: plan.miner,courier: plan.courier,traversal: nativeRemoteTraversalFor(username,config) },5,guard);
  if (quote.status !== 'complete' || !quote.facts.authority) return undefined;
  const births = proposeEconomicBirths(state,quote,config); if (!births.length) return undefined;
  const projected = createNativeStartupProjection(state)(quote,{ horizon: config.remoteStartupHorizon,protectedEnergy: config.remoteStartupEnergyReserve,births,incumbentMinimumBatch: config.remoteMinimumBatch,unaffordable: 'skip',repairPolicy: defaultMiningRepairPolicy,refills: [],householdFlows: [],sinkChanges: [] },guard);
  if (projected.status !== 'ready') return undefined;
  const binding = createNativeStartupExecutionBinding(state)(quote.plan,quote.rooms,config,startupEconomicPolicy(config)); if (!binding) return undefined;
  const query = { room: profile.room,source: profile.source,generation: profile.generation,binding,observedAt: quote.observedAt,expiresAt: Math.min(quote.facts.authority.expiresAt,quote.observedAt+config.remoteStartupHorizon),tick: Game.time,input: projected.input };
  if (query.observedAt+config.remoteStartupPlanningLead >= query.expiresAt) return undefined;
  const selections = createStartupSelections(state,profile.home);
  if (!selections.publish(selections.read().revision,Game.time,{ generation: profile.generation,binding,expiresAt: query.expiresAt,quote })) return undefined;
  const planner = createStartupPlanningJob(state,profile.home);
  planner.advance({ ...query,expectedRevision: planner.read().revision },config.remoteStartupFrames,guard);
  return query;
}
