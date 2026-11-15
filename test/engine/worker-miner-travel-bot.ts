import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const creep = Object.values(Game.creeps)[0]!;
  if (Game.time === 1) {
    creep.memory.population = { owner: 'work:W0N1:upgrader', home: 'W0N1' };
    creep.memory.workerSource = { source: creep.name, position: { room: 'E0N1', x: 3, y: 20 } };
  }
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { workersEnabled: true, workerEnergyProfile: 'upgrader' };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const room = Game.rooms.E0N1;
  const container = room?.find(FIND_STRUCTURES).find((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER);
  const row = { room: creep.room.name, energy: creep.store.energy, cargoHydrogen: creep.store.H ?? 0,
    visible: !!room, deposit: container?.store.energy ?? null, hydrogen: container?.store.H ?? null,
    progress: Game.rooms.W0N1!.controller!.progress };
  const memory = Memory as Memory & { workerTravel?: (typeof row)[] };
  (memory.workerTravel ??= []).push(row);
}
