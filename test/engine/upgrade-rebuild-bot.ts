import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { upgradeLifecycleSchema } from '../../src/features/work/upgrade-lifecycle-model';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { W0N1: { override: { upgradeLifecycleEnabled: true, upgradeCycleAtRcl8: true,
    upgradeRoomEnabled: true, upgradeRoomSpawningEnabled: true, upgradeRoomSponsor: 'E0N1',
    upgradeFleetTarget: 1, upgradeFleetBodyBudget: 300, upgradeFleetStartEnergy: 100, upgradeFleetStopEnergy: 50,
    upgradeMasterEnabled: true, upgradeMasterSpawningEnabled: true, upgradeMasterStorageThreshold: 500,
    upgradeRoomServiceEnabled: true, upgradeSupplyEnabled: true, upgradeSupplySpawningEnabled: true,
    upgradeSupplyTarget: 1, upgradeSupplyReserve: 99970 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const room = Game.rooms.W0N1!;
  const lifecycle = openState(state, 'upgrade-lifecycle/W0N1', upgradeLifecycleSchema);
  const units = Object.values(Game.creeps).map(creep => {
    const owner = creep.memory.population?.owner ?? '';
    const journal = creep.id && owner.startsWith('upgrade-supply:') ? createTransferJournal(state, creep.id).read() : undefined;
    const supplyDelivery = journal?.attempt?.kind === 'transfer' && journal.attempt.room === room.name && journal.result?.status === 'observed'
      ? journal.result.amount : 0;
    return { name: creep.name, owner, room: creep.room.name, spawning: creep.spawning, cargo: creep.store.energy, supplyDelivery };
  });
  const row = { tick: Game.time, level: room.controller!.level, owned: !!room.controller!.my, progress: room.controller!.progress ?? 0,
    cycles: lifecycle.cycles, storage: room.storage?.store.energy ?? 0, sponsorStock: Game.rooms.E0N1!.storage!.store.energy,
    sites: room.find(FIND_MY_CONSTRUCTION_SITES).length, roads: room.find(FIND_STRUCTURES).filter(item => item.structureType === STRUCTURE_ROAD).length, units };
  const memory = Memory as Memory & { upgradeRebuild?: (typeof row)[] };
  (memory.upgradeRebuild ??= []).push(row);
}
