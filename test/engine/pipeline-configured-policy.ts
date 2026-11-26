import { observePathActor } from './pipeline-path-probe';
import type { RemoteStartupProbe } from '../../src/app/remotes/startup/model';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { ConfiguredPipelineMemory } from './pipeline-configured';
import type { RuntimeConfig } from '../../src/config/model';
export function configuredStartupSettings(variant: ConfiguredPipelineMemory['pipelineConfiguredVariant']): Partial<RuntimeConfig> {
  const base = { remoteStartupPolicy: 'economic' as const,remoteStartupHorizon: variant === 'changed' ? 650 : 767,remoteStartupFrames: 32,remoteStartupPlanningLead: 30 };
  if (variant === 'refused') return { ...base,remoteStartupMinimumMargin: 1000000 };
  if (variant === 'budget') return { ...base,remoteWorkerCpuBudget: 5,remoteStartupFrames: 20,remoteStartupPlanningLead: 100 };
  return base;
}
/** Change only ordinary configuration; cleanup and fresh proposals remain production responsibilities. */
export function changeConfiguredPolicy(state: StatePort, memory: ConfiguredPipelineMemory): void {
  if (memory.pipelineConfiguredVariant !== 'changed' || ![45,70].includes(Game.time)) return;
  const record = openState(state,'operator/config',operatorSchema);
  record.empire = { ...record.empire as object,remoteStartupMinimumMargin: Game.time === 45 ? 1000000 : 0 };
  saveState(state,'operator/config',operatorSchema,record);
  (memory.pipelineConfiguredChanges ??= []).push(Game.time);
}

const coldActorTicks = new Set([311,591,861]);
function refusalOrColdActorPhase(phase: string, tick: number): boolean {
  return /:(?:denied|yield|deferred)$/.test(phase) || coldActorTicks.has(tick) && /^actor:[^:]+:(?:begin|execute|done)$/.test(phase);
}
function preparePathTrace(memory: ConfiguredPipelineMemory, phase: string): boolean {
  if (!memory.pipelineConfiguredPathProbeMode) return true;
  observePathActor(phase); return memory.pipelineConfiguredYieldTraceMode === true;
}
export const captureStartupTrace: RemoteStartupProbe = (profile,phase) => {
  const memory = Memory as ConfiguredPipelineMemory;
  if (!preparePathTrace(memory,phase)) return;
  if (memory.pipelineConfiguredActorTraceMode && !phase.startsWith('actor:')) return;
  if (memory.pipelineConfiguredYieldTraceMode && !refusalOrColdActorPhase(phase,Game.time)) return;
  if (!memory.pipelineConfiguredYieldTraceMode && memory.pipelineConfiguredCourierTraceMode && (Game.time < 200 || Game.time > 240)) return;
  const rows = memory.pipelineStartupTrace ??= [];
  if (rows.length < (memory.pipelineConfiguredActorTraceMode ? 600 : 200)) rows.push({ tick: Game.time,phase,owner: profile.owner,cpu: Game.cpu.getUsed() });
};

/** A calibration campaign cannot withdraw productive service before its own frozen forecast ends. */
export function configuredWithdrawalAt(memory: ConfiguredPipelineMemory): number {
  const proof = memory.pipelineCalibration;
  return memory.pipelineConfiguredMode && proof ? Math.max(800,proof.quote.observedAt+proof.horizon+1) : 800;
}
