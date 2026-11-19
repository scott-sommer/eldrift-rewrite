import { pipelineScenarioConfig } from './remote-pipeline-config';
import { loop as runtimeLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { remoteFleetIdentity } from '../../src/features/remotes/fleet/identity';
import { snapshotPipeline, pipelineIncome } from './remote-pipeline-probe';
import type { PipelineMemory } from './remote-pipeline-probe';
const state = createMemoryPort(() => Memory), home = 'W0N1';
export function loop(): void {
  const memory = Memory as PipelineMemory;
  if (Game.time === 1) setup();
  if (!memory.pipelineStopped && Game.time >= 800 && pipelineIncome(memory) >= 3000 && Object.values(Game.creeps).some(creep => remoteFleetIdentity(creep.memory.population?.owner ?? '')?.kind === 'courier' && creep.pos.roomName === 'E0N1' && creep.store.energy > 0)) {
    const config = openState(state,'operator/config',operatorSchema); config.empire = { ...config.empire as object,remoteMaximumSlots: 0 };
    saveState(state,'operator/config',operatorSchema,config); memory.pipelineStopped = Game.time;
  }
  runtimeLoop(); snapshotPipeline(state,memory);
}
function setup(): void {
  const config = openState(state,'operator/config',operatorSchema);
  config.empire = pipelineScenarioConfig();
  saveState(state,'operator/config',operatorSchema,config);
  createSpawnQueue(state,home).submit({ id: 'unrelated-pipeline',name: 'unrelated-pipeline',owner: 'unrelated',room: home,body: ['move'],priority: 100,readyAt: 10000,expiresAt: 20000 });
  state.write('fixture/remote-pipeline',{ owner: 'fixture',version: 1,data: { preserved: true } });
}
