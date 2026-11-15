import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { movementPosition } from '../../src/adapters/screeps/movement-traffic';
export function loop() {
  const creep = Game.creeps.build!;
  if (Game.time === 1) {
    const source = creep.room.find(FIND_SOURCES)[0]!;
    creep.memory.population = { owner: 'work:W0N1:upgrader', home: 'W0N1' };
    creep.memory.workerSource = { source: source.id, position: movementPosition(source.pos) };
  }
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true, workerEnergyProfile: 'upgrader' };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const containers = creep.room.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  const deposit = containers.find(item => item.pos.x === 21)!;
  const row = { energy: creep.store.energy, cargoHydrogen: creep.store.H ?? 0,
    depositEnergy: deposit.store.energy, hydrogen: deposit.store.H,
    unrelated: containers.find(item => item.pos.x === 18)!.store.energy, progress: creep.room.controller!.progress };
  const memory = Memory as Memory & { workerMiner?: (typeof row)[] };
  (memory.workerMiner ??= []).push(row);
}
