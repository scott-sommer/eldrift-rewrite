import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { haulingOwner } from '../../src/features/logistics/identity';
export function loop() {
  const state = createMemoryPort(() => Memory);
  const settings = openState(state, 'operator/config', operatorSchema);
  settings.empire = { logisticsEnabled: true, upgradeRoomServiceEnabled: true, upgradeSpawnEnergyFloor: 300, storeBalancingEnabled: true };
  saveState(state, 'operator/config', operatorSchema, settings);
  Game.creeps['service']!.memory.population = { home: 'W0N1', owner: haulingOwner('W0N1') };
  botLoop();
  const room = Game.rooms['W0N1']!;
  const lab = room.find(FIND_MY_STRUCTURES).find((item): item is StructureLab => item.structureType === 'lab')!;
  recordReceipts(state);
  const row = { lab: { mineral: lab.mineralType, amount: lab.mineralType ? lab.store.getUsedCapacity(lab.mineralType) : 0, energy: lab.store.energy },
    terminal: { H: room.terminal!.store.H ?? 0, GH: room.terminal!.store.GH ?? 0, XGH2O: room.terminal!.store.XGH2O ?? 0, energy: room.terminal!.store.energy },
    storageH: room.storage!.store.H ?? 0, cargo: Game.creeps['service']!.store.getUsedCapacity() };
  const memory = Memory as Memory & { upgradeService?: (typeof row)[] };
  (memory.upgradeService ??= []).push(row);
}

function recordReceipts(state: ReturnType<typeof createMemoryPort>): void {
  const memory = Memory as Memory & { upgradeServiceReceipts?: { seen: string[]; totals: Record<string, number> } };
  const evidence = memory.upgradeServiceReceipts ??= { seen: [], totals: {} };
  const envelope = state.read('logistics-requests/W0N1') as { data: { records: { request: { resource: string }; receipts: { id: string; amount: number }[] }[] } } | undefined;
  for (const record of envelope?.data.records ?? []) for (const receipt of record.receipts) {
    if (evidence.seen.includes(receipt.id)) continue;
    evidence.seen.push(receipt.id);
    const resource = record.request.resource;
    evidence.totals[resource] = (evidence.totals[resource] ?? 0) + receipt.amount;
  }
}

