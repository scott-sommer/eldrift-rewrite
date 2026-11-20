import { snapshotStartupPlanningJob } from './startup-planning-job';
import { createStartupProject, restoreStartupProject, forecastStartupProject } from '../../src/capabilities/economy/startup/project';
import type { StatePort, Envelope } from '../../src/persistence/versioned-state';
import { startupDeliveryInput } from '../fixtures/startup-delivery';
interface ProjectProof {
  savedAt: number; initialThrough: number; pendingBefore: number; checkpointCharacters: number;
  resumedAt?: number; recoveredThrough?: number; nextThrough?: number; frames?: number; accountedThrough?: number;
  result?: ReturnType<typeof forecastStartupProject>; uninterrupted?: ReturnType<typeof forecastStartupProject>;
}
interface ProjectMemory extends Memory { startupProjectProof?: ProjectProof }
/** Synthetic portable-model reset proof alongside ordinary native startup; not a native forecast calibration. */
export function snapshotStartupProjectCheckpoint(state: StatePort): void {
  snapshotStartupPlanningJob(state);
  const input = startupDeliveryInput(), memory = Memory as ProjectMemory;
  if (Game.time === 149) {
    const project = createStartupProject(input); project.advance(43); const checkpoint = project.checkpoint();
    state.write('fixture/startup-project',{ owner: 'fixture',version: 1,data: checkpoint });
    memory.startupProjectProof = { savedAt: Game.time,initialThrough: checkpoint.tick,pendingBefore: checkpoint.due.length,checkpointCharacters: JSON.stringify(checkpoint).length };
    return;
  }
  const envelope = state.read('fixture/startup-project') as Envelope | undefined, proof = memory.startupProjectProof;
  if (!proof || envelope?.owner !== 'fixture' || envelope.version !== 1) throw new Error('Missing native project checkpoint fixture');
  const project = restoreStartupProject(input,envelope.data), before = project.advance(0), next = project.advance(1);
  project.advance(input.project.spawning.cash.horizon+1);
  Object.assign(proof,{ resumedAt: Game.time,recoveredThrough: before.through,nextThrough: next.through,frames: next.frames,accountedThrough: next.accountedThrough,
    result: project.result(),uninterrupted: forecastStartupProject(input) });
}
