import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.rooms = { E0N1: { override: { upgradeMasterEnabled: true, upgradeMasterSpawningEnabled: true,
    upgradeRoomServiceEnabled: true, upgradeRoomSponsor: 'W0N1', upgradeFleetStartEnergy: 100, upgradeFleetStopEnergy: 50 } } };
  saveState(state, 'operator/config', operatorSchema, settings);
  const before = Object.keys(Game.creeps).length;
  botLoop();
  const room = Game.rooms.E0N1!;
  const units = Object.values(Game.creeps).map(creep => ({ name: creep.name, home: creep.memory.population?.home,
    owner: creep.memory.population?.owner, room: creep.room.name, x: creep.pos.x, y: creep.pos.y, spawning: creep.spawning,
    carry: creep.body.filter(part => part.type === CARRY).length, move: creep.body.filter(part => part.type === MOVE).length, cargo: creep.store.energy }));
  const audit = Memory as Memory & { masterBootstrapReceipts?: { seen: string[]; total: number } };
  const receipts = audit.masterBootstrapReceipts ??= { seen: [], total: 0 };
  for (const record of openState(state, 'logistics-requests/E0N1', logisticsQueueSchema).records) {
    if (record.request.owner !== 'upgrade-service:E0N1') continue;
    for (const receipt of record.receipts) {
      if (receipts.seen.includes(receipt.id)) continue;
      receipts.seen.push(receipt.id);
      receipts.total += receipt.amount;
    }
  }
  const received = receipts.total;
  const row = { tick: Game.time, before, units, sponsorEnergy: Game.rooms.W0N1!.energyAvailable, level: room.controller!.level,
    storage: room.storage!.store.energy, storageActive: room.storage!.isActive(), terminalActive: room.terminal!.isActive(), received };
  const memory = Memory as Memory & { masterBootstrap?: (typeof row)[] };
  (memory.masterBootstrap ??= []).push(row);
}
