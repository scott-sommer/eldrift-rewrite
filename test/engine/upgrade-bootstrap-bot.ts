import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { W0N1: { override: { upgradeRoomEnabled: true, upgradeRoomSpawningEnabled: true,
    upgradeFleetTarget: 1, upgradeFleetBodyBudget: 300, upgradeFleetStartEnergy: 100, upgradeFleetStopEnergy: 50 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const room = Game.rooms.W0N1!;
  const row = { tick: Game.time, progress: room.controller!.progress, sites: room.find(FIND_MY_CONSTRUCTION_SITES).length,
    roads: room.find(FIND_STRUCTURES).filter(item => item.structureType === STRUCTURE_ROAD).length,
    units: Object.values(Game.creeps).map(creep => ({ owner: creep.memory.population?.owner, energy: creep.store.energy, spawning: creep.spawning })) };
  const memory = Memory as Memory & { bootstrap?: (typeof row)[] };
  (memory.bootstrap ??= []).push(row);
}
