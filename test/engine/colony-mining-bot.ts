import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { miningEnabled: true, miningBodyBudget: 200 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const memory = Memory as Memory & { colonyMining?: { accepted: number; delivered: number; workers: number; queued: number } };
  const creeps = Object.values(Game.creeps);
  const container = Game.rooms['W0N1']!.find(FIND_STRUCTURES).find(
    (item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER && item.pos.x === 17 && item.pos.y === 15)!;
  memory.colonyMining = { accepted: creeps.length, workers: creeps.length, delivered: container.store.energy,
    queued: createSpawnQueue(state, 'W0N1').list().length };
}
