import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { createGroundJournal } from '../../src/features/logistics/ground-journal';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { E0N1: { override: { upgradeRoomEnabled: true, upgradeSupplyEnabled: Game.time < 210,
    upgradeSupplySpawningEnabled: true, upgradeRoomSponsor: 'W0N1', upgradeSupplyTarget: 1, upgradeSupplyReserve: 70,
    upgradeFleetStartEnergy: 50, upgradeFleetStopEnergy: 10 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  const before = Object.keys(Game.creeps).length;
  botLoop();
  const units = Object.values(Game.creeps).map(creep => ({ name: creep.name, room: creep.room.name,
    home: creep.memory.population?.home, owner: creep.memory.population?.owner, spawning: creep.spawning,
    carry: creep.body.filter(part => part.type === CARRY).length, move: creep.body.filter(part => part.type === MOVE).length,
    energy: creep.store.energy, drop: creep.id ? createGroundJournal(state, creep.id).read() : null }));
  const row = { before, units, energy: Game.rooms.W0N1!.energyAvailable,
    source: Game.rooms.W0N1!.storage!.store.energy, queued: createSpawnQueue(state, 'W0N1').list().length };
  const memory = Memory as Memory & { supplyFleet?: (typeof row)[] };
  (memory.supplyFleet ??= []).push(row);
}
