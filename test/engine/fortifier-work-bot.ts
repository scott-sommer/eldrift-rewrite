import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const creep = Game.creeps.build!;
  creep.memory.population ??= { owner: 'work:W0N1:fortifier', home: 'W0N1' };
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true, workerWallHits: 300, workerRampartHits: 300 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const structures = creep.room.find(FIND_STRUCTURES);
  const row = { energy: creep.store.energy, progress: creep.room.controller!.progress,
    wall: structures.find(item => item.structureType === STRUCTURE_WALL)!.hits,
    rampart: structures.find(item => item.structureType === STRUCTURE_RAMPART)!.hits };
  const memory = Memory as Memory & { fortifier?: (typeof row)[] };
  (memory.fortifier ??= []).push(row);
}
