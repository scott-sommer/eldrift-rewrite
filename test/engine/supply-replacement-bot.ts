import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { E1N1: { override: { upgradeRoomEnabled: true, upgradeSupplyEnabled: true,
    upgradeSupplySpawningEnabled: true, upgradeRoomSponsor: 'W0N1', upgradeSupplyTarget: 1, upgradeSupplyReserve: 700,
    upgradeFleetStartEnergy: 50, upgradeFleetStopEnergy: 10 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const units = Object.values(Game.creeps).map(creep => {
    const transfer = creep.id ? createTransferJournal(state, creep.id).read() : undefined;
    const delivery = transfer?.attempt?.kind === 'transfer' && transfer.attempt.room === 'E1N1' && transfer.result?.status === 'observed'
      ? { id: transfer.attempt.id, amount: transfer.result.amount } : null;
    return { name: creep.name, room: creep.room.name, cargo: creep.store.energy, ttl: creep.ticksToLive ?? 1500, spawning: creep.spawning, delivery };
  });
  const row = { tick: Game.time, route: Game.time === 1 ? Game.map.findRoute('W0N1', 'E1N1') : null, units, spawnEnergy: Game.rooms.W0N1!.energyAvailable, source: Game.rooms.W0N1!.storage!.store.energy, target: Game.rooms.E1N1!.storage!.store.energy };
  const memory = Memory as Memory & { supplyReplacement?: (typeof row)[] };
  (memory.supplyReplacement ??= []).push(row);
}
