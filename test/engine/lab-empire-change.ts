import { industry } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState, peekState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { logisticsQueueSchema } from '../../src/features/logistics/request-schema';
import { labServiceOwner } from '../../src/features/industry/lab-services';
import { createEmpireProductionStore } from '../../src/features/industry/empire-production/store';
import type { EmpireProductionWindow } from '../../src/features/industry/empire-production/model';
const state = createMemoryPort(() => Memory);
declare global { interface Memory { empirePolicyChange?: { tick: number; mode: string; cargo: number; receipts: number; oldWindow: EmpireProductionWindow; oldRoot: number; oldHomeRoot: number } } }
export function labReceiptTotal(home: string): number {
  const queue = peekState(state,'logistics-requests/'+home,logisticsQueueSchema);
  return (queue?.records ?? []).filter(record => record.request.owner.startsWith(labServiceOwner(home,''))).reduce((sum,record) => sum+record.receipts.reduce((sum,receipt) => sum+receipt.amount,0),0);
}
export function changeEmpirePolicy(mode: 'normal' | 'policy' | 'participant'): void {
  if (mode === 'normal' || Memory.empirePolicyChange) return;
  const courier = Game.creeps['boost-courier']!, cargo = courier.store.getUsedCapacity(RESOURCE_HYDROGEN)+courier.store.getUsedCapacity(RESOURCE_UTRIUM);
  const oldWindow = createEmpireProductionStore(state,() => false).list().find(window => window.home === 'W0N1');
  if (!cargo || !oldWindow || oldWindow.retiring) return;
  const oldHomeRoot = rootStock('W0N1'), oldRoot = oldHomeRoot+rootStock('W1N1');
  Memory.empirePolicyChange = { tick: Game.time,mode,cargo,receipts: labReceiptTotal('W0N1'),oldWindow,oldRoot,oldHomeRoot };
  if (mode === 'participant') industry.labs.configure('W0N1',{ labProductionScope: 'room',labReactionsEnabled: false });
  else {
    const settings = openState(state,'operator/config',operatorSchema);
    settings.empire = { ...settings.empire as object,labProductionTargets: [{ product: 'UH',amount: 15,priority: 0 }] };
    saveState(state,'operator/config',operatorSchema,settings);
  }
}
function rootStock(home: string): number {
  const room = Game.rooms[home]!, labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  return room.storage!.store.getUsedCapacity(RESOURCE_UTRIUM_ACID)+labs.reduce((sum,lab) => sum+lab.store.getUsedCapacity(RESOURCE_UTRIUM_ACID),0)
    +Object.values(Game.creeps).filter(creep => creep.room.name === home).reduce((sum,creep) => sum+creep.store.getUsedCapacity(RESOURCE_UTRIUM_ACID),0);
}
