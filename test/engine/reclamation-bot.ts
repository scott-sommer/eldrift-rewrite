import { loop as botLoop } from '../../src/main';
import { haulingOwner } from '../../src/app/native-logistics';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const memory = Memory as Memory & { reclamation?: number[][] };
  const history = memory.reclamation ??= [];
  const state = createMemoryPort(() => Memory);
  const creep = Game.creeps['hauler']!;
  creep.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, energyRequestsEnabled: true,
    energyReclamationEnabled: history.length >= 2 && history.length < 4 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const structures = creep.room.find(FIND_STRUCTURES);
  const lab = structures.find((item): item is StructureLab => item.structureType === STRUCTURE_LAB)!;
  const extension = structures.find((item): item is StructureExtension => item.structureType === STRUCTURE_EXTENSION)!;
  history.push([lab.store.energy, lab.store.H ?? 0, creep.store.energy, extension.store.energy]);
}
