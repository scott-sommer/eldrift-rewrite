import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { observeStartupBirths } from '../../src/adapters/screeps/startup-birth-observation';
import { createNativeStartupExecutionBinding } from '../../src/app/remotes/startup/execution-binding';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { createStartupForecastAdmission } from '../../src/features/remotes/startup/candidates/birth-admission';
import { decodeStartupPlanningInput } from '../../src/features/remotes/startup/planning/input';
import { forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import type { StartupDeliveryInput } from '../../src/capabilities/economy/startup/delivery-model';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { RuntimeConfig } from '../../src/config/model';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
import type { NativeStartupQuote } from '../../src/app/remotes/startup/projection/model';
import type { CalibrationMemory } from './pipeline-cohort-calibration';
export type NativeCalibrationQuote = NativeStartupQuote & { rooms: string[] };
export interface PipelineEconomicContext { binding: string; generation: number; expiresAt: number }
export interface PipelineEconomicMemory extends Memory { pipelineEconomicChangeMode?: boolean; pipelineEconomicChanges?: number[]; pipelineEconomicMode?: boolean; pipelineEconomicChecks?: { tick: number; request: string; allowed: boolean; bindingMatches: boolean }[] }
function policy(horizon: number) { return { minimumRecoveryMargin: 0,minimumDeliveredEnergy: 1,maximumRecoveryTicks: horizon,maximumHouseholdCapital: 10000 }; }
export function forecastPipelineCalibration(state: StatePort, profile: Readonly<RemoteFleetProfile>, quote: NativeCalibrationQuote, input: StartupDeliveryInput, config: Readonly<RuntimeConfig>, horizon: number, guard: () => boolean) {
  if (!(Memory as PipelineEconomicMemory).pipelineEconomicMode) return { status: 'ready' as const,result: forecastStartupProject(input) };
  const binding = createNativeStartupExecutionBinding(state)(quote.plan,quote.rooms,config,policy(horizon));
  if (!binding) return { status: 'deferred' as const,reason: 'economic-binding' };
  const economic = { binding,generation: profile.generation,expiresAt: Math.min(quote.facts.authority!.expiresAt,quote.observedAt+horizon) };
  const planner = createStartupPlanningJob(state,profile.home);
  const query = { ...economic,room: profile.room,source: profile.source,observedAt: quote.observedAt,tick: Game.time,input };
  const progress = planner.advance({ ...query,expectedRevision: planner.read().revision },horizon+1,guard);
  if (progress.status !== 'complete') return { status: 'deferred' as const,reason: 'economic-'+progress.reason };
  return { status: 'ready' as const,result: progress.result,economic };
}
export function admitPipelineEconomic(state: StatePort, profile: Readonly<RemoteFleetProfile>, request: Readonly<SpawnRequest>, config: Readonly<RuntimeConfig>): boolean {
  const memory = Memory as PipelineEconomicMemory & CalibrationMemory;
  if (!memory.pipelineEconomicMode) return true;
  const proof = memory.pipelineCalibration, economic = proof?.economic;
  if (!proof || !economic) return false;
  const currentPolicy = policy(proof.horizon), binding = createNativeStartupExecutionBinding(state)(proof.quote.plan,proof.quote.rooms,config,currentPolicy);
  const query = { ...economic,room: profile.room,source: profile.source,observedAt: proof.quote.observedAt,tick: Game.time,input: decodeStartupPlanningInput(proof.input) };
  const allowed = !!binding && createStartupForecastAdmission(state,profile.home)(profile,request,{ query,policy: currentPolicy,binding,tick: Game.time,births: observeStartupBirths(query.input.project.spawning.requests) });
  (memory.pipelineEconomicChecks ??= []).push({ tick: Game.time,request: request.id,allowed,bindingMatches: binding === economic.binding });
  return allowed;
}

export function changePipelineEconomicPolicy(state: StatePort): void {
  const memory = Memory as PipelineEconomicMemory & { pipelineStopped?: number };
  if (!memory.pipelineEconomicChangeMode || ![50,60,120].includes(Game.time)) return;
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = { ...config.empire as object,...(Game.time === 120 ? { remoteMaximumSlots: 0 } : { remoteStartupEnergyReserve: Game.time === 50 ? 1 : 0 }) };
  saveState(state,'operator/config',operatorSchema,config);
  (memory.pipelineEconomicChanges ??= []).push(Game.time);
  if (Game.time === 120) memory.pipelineStopped = Game.time;
}
