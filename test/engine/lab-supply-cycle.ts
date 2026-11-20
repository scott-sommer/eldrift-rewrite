import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { haulingOwner } from '../../src/features/logistics/identity';
import type { LabState } from '../../src/features/industry/lab-state';
interface Row { tick: number; product: string; labOH: number; labUH: number; bankOH: number; bankUH: number; bankX: number; cargo: number; assignment: string | null; receipts: number }
declare global { interface Memory { labSupply?: Row[] } }
export function runLabSupply(mode: 'normal' | 'switch' | 'cancel' | 'depleted'): void {
  const room = Game.rooms['W0N1']!, courier = Game.creeps['lab-courier']!;
  courier.memory.population = { owner: haulingOwner(room.name),home: room.name };
  const state = createMemoryPort(() => Memory), settings = openState(state,'operator/config',operatorSchema);
  const product = mode === 'switch' && Game.time >= 140 ? 'UH' : 'OH';
  settings.empire = { logisticsEnabled: true,labReactionsEnabled: !(mode === 'cancel' && Game.time >= 8),labReactionProduct: product,
    labReactionTarget: 15,labReagentReserve: 5,labTransportBatch: 20 };
  saveState(state,'operator/config',operatorSchema,settings);
  botLoop();
  const labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  const amount = (resource: ResourceConstant) => labs.reduce((sum,lab) => sum+(lab.store.getUsedCapacity(resource) ?? 0),0);
  const assignment = state.read('industry-labs/W0N1') as { data: LabState };
  const requests = state.read('logistics-requests/W0N1') as { data: { records: { receipts: { amount: number }[] }[] } };
  const receipts = requests.data.records.reduce((sum,record) => sum+record.receipts.reduce((sum,receipt) => sum+receipt.amount,0),0);
  (Memory.labSupply ??= []).push({ tick: Game.time,product,labOH: amount(RESOURCE_HYDROXIDE),labUH: amount(RESOURCE_UTRIUM_HYDRIDE),
    bankOH: room.storage!.store.getUsedCapacity(RESOURCE_HYDROXIDE),bankUH: room.storage!.store.getUsedCapacity(RESOURCE_UTRIUM_HYDRIDE),
    bankX: room.storage!.store.getUsedCapacity(RESOURCE_CATALYST),cargo: courier.store.getUsedCapacity(),assignment: assignment.data.assignment?.product ?? null,receipts });
}
