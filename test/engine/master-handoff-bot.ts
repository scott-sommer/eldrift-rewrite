import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { upgradeMasterOwner } from '../../src/features/work/upgrade-identity';
import { upgradeSupplyOwner } from '../../src/features/work/upgrade-supply';
import { createTransferJournal } from '../../src/features/logistics/transfer-journal';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
const state = createMemoryPort(() => Memory);
export function loop() {
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { E0N1: { override: { upgradeRoomEnabled: true, upgradeMasterEnabled: true,
    upgradeRoomServiceEnabled: true, upgradeRoomSponsor: 'W0N1', upgradeSupplyEnabled: true,
    upgradeSupplyReserve: 4000, upgradeSupplyTarget: 1, upgradeFleetStartEnergy: 100, upgradeFleetStopEnergy: 50,
    upgradeRoomEmpireReserve: 0, upgradeRoomOtherReserve: 0 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  const master = Game.creeps.master!, supplier = Game.creeps.supplier!;
  master.memory.population = { owner: upgradeMasterOwner('E0N1'), home: 'E0N1' };
  supplier.memory.population = { owner: upgradeSupplyOwner('W0N1', 'E0N1'), home: 'W0N1' };
  botLoop();
  record(master, supplier);
}
function serviceReceived(): number {
  const memory = Memory as Memory & { handoffReceipts?: { seen: string[]; total: number } };
  const audit = memory.handoffReceipts ??= { seen: [], total: 0 };
  for (const record of openState(state, 'logistics-requests/E0N1', logisticsQueueSchema).records) {
    if (record.request.owner !== 'upgrade-service:E0N1') continue;
    for (const receipt of record.receipts) if (!audit.seen.includes(receipt.id)) {
      audit.seen.push(receipt.id); audit.total += receipt.amount;
    }
  }
  return audit.total;
}
function record(master: Creep, supplier: Creep): void {
  const room = Game.rooms.E0N1!, journal = createTransferJournal(state, master.id).read();
  const row = { tick: Game.time, master: master.store.energy, supplier: supplier.store.energy,
    x: master.pos.x, y: master.pos.y, adjacent: master.pos.isNearTo(supplier), level: room.controller!.level,
    extensions: room.find(FIND_MY_STRUCTURES).filter((item): item is StructureExtension => item.structureType === STRUCTURE_EXTENSION)
      .reduce((sum, item) => sum + item.store.energy, 0),
    storage: room.storage!.store.energy, spawn: room.find(FIND_MY_SPAWNS)[0]!.store.energy,
    container: room.find(FIND_STRUCTURES).filter((item): item is StructureContainer => item.structureType === STRUCTURE_CONTAINER)
      .reduce((sum, item) => sum + item.store.energy, 0), source: Game.rooms.W0N1!.storage!.store.energy,
    total: Object.keys(Game.creeps).length, masterAttempt: journal.attempt,
    incoming: createTransferJournal(state, supplier.id).read(), serviceReceived: serviceReceived() };
  const memory = Memory as Memory & { masterHandoff?: (typeof row)[] };
  (memory.masterHandoff ??= []).push(row);
}
