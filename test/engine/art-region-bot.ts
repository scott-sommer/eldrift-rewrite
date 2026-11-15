import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const creep = Game.creeps.build!;
  if (Game.time === 1) {
    creep.room.createFlag(18, 21, 'ArtBL');
    creep.room.createFlag(20, 21, 'ArtTR');
    creep.memory.population = { owner: 'work:W0N1:fortifier', home: 'W0N1' };
    return;
  }
  if (Game.time === 5) Game.flags.ArtTR!.setPosition(19, 21);
  if (Game.time === 8) Game.flags.ArtBL!.remove();
  if (Game.time === 11) Game.flags.ArtTR!.remove();
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true, workerWallHits: 300, workerRampartHits: 300 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const structures = creep.room.find(FIND_STRUCTURES);
  const row = { tick: Game.time, energy: creep.store.energy, flags: creep.room.find(FIND_FLAGS).length,
    wall: structures.find(item => item.structureType === STRUCTURE_WALL)!.hits,
    rampart: structures.find(item => item.structureType === STRUCTURE_RAMPART)!.hits };
  const memory = Memory as Memory & { artRegion?: (typeof row)[] };
  (memory.artRegion ??= []).push(row);
}
