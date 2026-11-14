import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { haulingOwner } from '../../src/features/logistics/identity';
import { upgradeMasterOwner, upgradeOwner } from '../../src/features/work/upgrade-identity';
const state = createMemoryPort(() => Memory);
export function loop() {
  const settings = openState(state, 'operator/config', operatorSchema);
  const contention = !!Game.creeps.ring;
  settings.empire = { upgradeRoomEnabled: contention, upgradeRoomEmpireReserve: 0, upgradeRoomOtherReserve: 0, logisticsEnabled: true, courierSpawningEnabled: true, upgradeMasterEnabled: true,
    upgradeMasterSpawningEnabled: !contention, upgradeRoomServiceEnabled: true, upgradeFleetStartEnergy: 100, upgradeFleetStopEnergy: 50 };
  saveState(state, 'operator/config', operatorSchema, settings);
  Game.creeps.local!.memory.population = { owner: haulingOwner('W0N1'), home: 'W0N1' };
  if (Game.creeps.master) Game.creeps.master.memory.population = { owner: upgradeMasterOwner('W0N1'), home: 'W0N1' };
  if (Game.creeps.ring) Game.creeps.ring.memory.population = { owner: upgradeOwner('W0N1'), home: 'W0N1' };
  const before = Object.values(Game.creeps).filter(creep => creep.memory.population?.owner === upgradeMasterOwner('W0N1')).length;
  botLoop();
  const room = Game.rooms.W0N1!;
  const master = Object.values(Game.creeps).find(creep => creep.memory.population?.owner === upgradeMasterOwner('W0N1'));
  const lab = room.find(FIND_MY_STRUCTURES).find((item): item is StructureLab => item.structureType === STRUCTURE_LAB)!;
  const row = { before, ring: Game.creeps.ring ? { ttl: Game.creeps.ring.ticksToLive } : null, total: Object.keys(Game.creeps).length, localCargo: Game.creeps.local!.store.getUsedCapacity(),
    master: master ? { name: master.name, spawning: master.spawning, parts: master.body.map(part => part.type),
      ttl: master.ticksToLive ?? 0, x: master.pos.x, y: master.pos.y, cargo: master.store.getUsedCapacity() } : null,
    lab: { mineral: lab.mineralType, amount: lab.mineralType ? lab.store.getUsedCapacity(lab.mineralType) : 0 },
    terminal: { H: room.terminal!.store.H ?? 0, GH: room.terminal!.store.GH ?? 0, XGH2O: room.terminal!.store.XGH2O ?? 0 },
    storageH: room.storage!.store.H ?? 0 };
  const memory = Memory as Memory & { upgradeMaster?: (typeof row)[]; masterReceipts?: { seen: string[]; totals: Record<string, number> } };
  (memory.upgradeMaster ??= []).push(row);
  const receipts = memory.masterReceipts ??= { seen: [], totals: {} };
  const envelope = state.read('logistics-requests/W0N1') as { data: { records: { request: { resource: string }; receipts: { id: string; amount: number }[] }[] } };
  for (const record of envelope.data.records) for (const receipt of record.receipts) {
    if (receipts.seen.includes(receipt.id)) continue;
    receipts.seen.push(receipt.id);
    receipts.totals[record.request.resource] = (receipts.totals[record.request.resource] ?? 0) + receipt.amount;
  }
}
