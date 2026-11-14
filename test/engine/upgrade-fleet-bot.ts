import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { E0N1: { override: { upgradeRoomEnabled: true, upgradeRoomSpawningEnabled: true,
    upgradeRoomSponsor: 'W0N1', upgradeFleetTarget: 1, upgradeFleetStartEnergy: 100, upgradeFleetStopEnergy: 50,
    upgradeRoomEmpireReserve: 0, upgradeRoomOtherReserve: 0 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  const before = Object.keys(Game.creeps).length;
  botLoop();
  const units = Object.values(Game.creeps).map(creep => ({ name: creep.name, room: creep.room.name, x: creep.pos.x, y: creep.pos.y,
    home: creep.memory.population?.home, owner: creep.memory.population?.owner, spawning: creep.spawning, parts: creep.body.length,
    work: creep.body.filter(part => part.type === WORK).length }));
  const row = { before, units, energy: Game.rooms.W0N1!.energyAvailable, queued: createSpawnQueue(state, 'W0N1').list().length, progress: Game.rooms.E0N1!.controller!.progress ?? 0 };
  const memory = Memory as Memory & { upgradeFleet?: (typeof row)[] };
  (memory.upgradeFleet ??= []).push(row);
}
