import { createStartupCohortMaintenance } from '../../src/features/remotes/startup/candidates/cohort-maintenance';
import { currentPipelineEconomic } from './pipeline-economic';
import type { PipelineEconomicMemory } from './pipeline-economic';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { RuntimeConfig } from '../../src/config/model';
import type { RemoteFleetProfile } from '../../src/features/remotes/fleet/model';
interface MaintenanceMemory extends PipelineEconomicMemory { pipelineEconomicMaintenance?: { tick: number; reason: string; cancelled: string[]; occupied: string[]; conflicts: string[]; bindingMatches: boolean }[] }
export function maintainPipelineEconomic(state: StatePort, profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>): boolean {
  const memory = Memory as MaintenanceMemory; if (!memory.pipelineEconomicMode) return true;
  const current = currentPipelineEconomic(state,profile,config); if (!current) return true;
  if (profile.room !== current.query.room || profile.source !== current.query.source || profile.generation !== current.query.generation) return false;
  const result = createStartupCohortMaintenance(state,profile.home)(current,new Set(Object.keys(Game.creeps)));
  if (result.status === 'current') return true;
  const rows = memory.pipelineEconomicMaintenance ??= [];
  if (rows.at(-1)?.reason !== result.reason || result.cancelled.length) rows.push({ ...result,tick: Game.time,bindingMatches: current.binding === current.query.binding });
  return false;
}
