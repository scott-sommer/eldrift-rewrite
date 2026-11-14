import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { miningEnabled: true, mineralMiningEnabled: true, miningBodyBudget: 200 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const memory = Memory as Memory & { colonyMineral?: { workers: number; queued: number; delivered: number } };
  const container = Game.rooms['W0N1']!.find(FIND_STRUCTURES).find(
    (item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER && item.pos.x === 17 && item.pos.y === 15)!;
  memory.colonyMineral = { workers: Object.keys(Game.creeps).length,
    queued: createSpawnQueue(state, 'W0N1').list().length, delivered: container.store.H ?? 0 };
}
