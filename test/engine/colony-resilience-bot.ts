import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { recoverySchema } from '../../src/features/recovery/schema';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { miningEnabled: true, miningBodyBudget: 200, logisticsEnabled: true, energyRequestsEnabled: true,
    energyBankingEnabled: true, courierSpawningEnabled: true, courierBodyBudget: 100,
    recoveryEnabled: true, recoveryScavengerEnabled: false, recoveryInterval: 1, recoveryEnterEnergy: 25, recoveryExitEnergy: 100,
    workersEnabled: true, workerSpawningEnabled: true, workerBuilderTarget: 1, workerBodyBudget: 250,
    workerEnergyStorageReserve: 100, workerUpgradeReserve: 100 };
  saveState(state, 'operator/config', operatorSchema, settings);
  botLoop();
  const room = Game.rooms.W0N1!;
  const audit = Memory as Memory & { resilienceReceipts?: { seen: string[]; total: number } };
  const receipts = audit.resilienceReceipts ??= { seen: [], total: 0 };
  for (const record of openState(state, 'logistics-requests/W0N1', logisticsQueueSchema).records) {
    for (const receipt of record.receipts) {
      if (receipts.seen.includes(receipt.id)) continue;
      receipts.seen.push(receipt.id); receipts.total += receipt.amount;
    }
  }
  const units = Object.values(Game.creeps).map(creep => {
    const owner = creep.memory.population?.owner ?? '';
    const role = owner.startsWith('mining:') ? 'miner' : owner.startsWith('work:') ? 'worker' : 'hauler';
    return { name: creep.name, role, spawning: creep.spawning, cargo: creep.store.energy };
  });
  const row = { tick: Game.time, units, active: openState(state, 'recovery/W0N1', recoverySchema('W0N1')).active,
    stored: room.storage!.store.energy, spawn: room.energyAvailable, source: room.find(FIND_SOURCES)[0]!.energy,
    progress: room.controller!.progress, delivered: receipts.total, sites: room.find(FIND_MY_CONSTRUCTION_SITES).length,
    roads: room.find(FIND_STRUCTURES).filter(item => item.structureType === STRUCTURE_ROAD).length };
  const memory = Memory as Memory & { colonyResilience?: (typeof row)[] };
  (memory.colonyResilience ??= []).push(row);
}
