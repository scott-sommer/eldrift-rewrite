import { createNativeStartupTravel } from '../../src/app/remotes/startup/travel/native';
import { createNativeStartupProjection } from '../../src/app/remotes/startup/projection/native';
import { nativeRemoteTraversalFor } from '../../src/app/remotes/management/policy';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import { encodeStartupPlanningInput } from '../../src/features/remotes/startup/planning/input';
import { calibrationBirths } from './pipeline-cohort-births';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { RuntimeConfig } from '../../src/config/model';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
import type { StartupTravelPlan } from '../../src/features/remotes/startup/travel-model';
import type { NativeStartupQuote } from '../../src/app/remotes/startup/projection/model';
interface CalibrationProof { quote: NativeStartupQuote; input: ReturnType<typeof encodeStartupPlanningInput>; result: ReturnType<typeof forecastStartupProject>; horizon: number; events: { tick: number; actor: string; action: string; amount: number }[] }
export interface CalibrationMemory extends Memory { pipelineCalibrationMode?: boolean; pipelineCalibration?: CalibrationProof; pipelineCalibrationAttempts?: { tick: number; reason: string }[] }
export function capturePipelineCalibration(state: StatePort, profile: Readonly<RemoteFleetProfile>, plan: StartupTravelPlan, config: Readonly<RuntimeConfig>, guard: () => boolean): boolean {
  const memory = Memory as CalibrationMemory;
  if (!memory.pipelineCalibrationMode || memory.pipelineCalibration) return true;
  if (profile.kind !== 'miner') return false;
  const username = Game.rooms[plan.home]!.controller!.owner!.username;
  const quote = createNativeStartupTravel(state,{ availableEnergy: (_home,available) => available },{ maximumRooms: 2,maximumOps: 10000 })({ target: { home: plan.home,room: plan.room,source: plan.source,station: plan.station,endpoint: plan.endpoint.id,username,tick: Game.time },spawn: plan.spawn.id,exit: plan.spawn.exit,collection: plan.collection,deposit: plan.endpoint.deposit,miner: plan.miner,courier: plan.courier,traversal: nativeRemoteTraversalFor(username,config) },5,guard);
  if (quote.status !== 'complete') return deferred(memory,quote.reason);
  const horizon = 120, projected = createNativeStartupProjection(state)(quote,{ horizon,protectedEnergy: 0,births: calibrationBirths(state,quote,config),unaffordable: 'skip',repairPolicy: null,refills: [],householdFlows: [],sinkChanges: [] },guard);
  if (projected.status !== 'ready') return deferred(memory,projected.reason);
  memory.pipelineCalibration = { quote,input: encodeStartupPlanningInput(projected.input),result: forecastStartupProject(projected.input),horizon,events: [] };
  return true;
}
function deferred(memory: CalibrationMemory, reason: string): false {
  (memory.pipelineCalibrationAttempts ??= []).push({ tick: Game.time,reason }); return false;
}
export function recordCalibrationCall(creep: Creep, action: string, target: { energy?: number }, amount?: number): void {
  const proof = (Memory as CalibrationMemory).pipelineCalibration;
  if (!proof || Game.time > proof.quote.observedAt+proof.horizon) return;
  const energy = action === 'harvest' ? Math.min(creep.getActiveBodyparts(WORK)*HARVEST_POWER,target.energy ?? 0,creep.store.getFreeCapacity(RESOURCE_ENERGY)) : amount ?? 0;
  proof.events.push({ tick: Game.time,actor: creep.name,action,amount: energy });
}
