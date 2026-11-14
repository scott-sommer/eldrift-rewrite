import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { workOwner } from '../../src/features/work/identity';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const creep = Game.creeps['build']!;
  creep.memory.population = { owner: workOwner('W0N1'), home: 'W0N1' };
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true, workerUpgradeReserve: 0, workerEnergyStorageReserve: 50000,
    workerCargoDropFallback: !Game.creeps['hold-marker'] };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const row = { energy: creep.store.energy, hydrogen: creep.store.H ?? 0, stored: creep.room.storage?.store.H ?? 0,
    dropped: creep.room.find(FIND_DROPPED_RESOURCES).filter(item => item.resourceType === 'H').reduce((sum, item) => sum + item.amount, 0),
    progress: creep.room.controller!.progress, sites: creep.room.find(FIND_MY_CONSTRUCTION_SITES).length };
  const memory = Memory as Memory & { workerCargo?: (typeof row)[] };
  (memory.workerCargo ??= []).push(row);
}
