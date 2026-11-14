import { loop as botLoop } from '../../src/main';
import { haulingOwner } from '../../src/app/native-logistics';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const creep = Game.creeps['hauler']!;
  creep.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, energyRequestsEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const structures = creep.room.find(FIND_STRUCTURES);

  const sink = structures.find((item): item is StructureSpawn => item.structureType === STRUCTURE_SPAWN)!;
  const memory = Memory as Memory & { energySupply?: number[][] };
  (memory.energySupply ??= []).push([creep.store.energy, sink.store.energy]);
}

