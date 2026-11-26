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
