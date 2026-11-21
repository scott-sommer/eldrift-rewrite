import { industry } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { peekState } from '../../src/persistence/versioned-state';
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
export function changeEmpirePolicy(mode: 'normal' | 'policy' | 'participant' | 'pause'): void {
  if (mode === 'pause' && Memory.empirePolicyChange && Game.time === Memory.empirePolicyChange.tick+30) industry.labs.setReactionsPaused(false);
  if (mode === 'normal' || Memory.empirePolicyChange) return;
  const courier = Game.creeps['boost-courier']!, cargo = courier.store.getUsedCapacity(RESOURCE_HYDROGEN)+courier.store.getUsedCapacity(RESOURCE_UTRIUM);
  const oldWindow = createEmpireProductionStore(state,() => false).list().find(window => window.home === 'W0N1');
  if (!cargo || !oldWindow || oldWindow.retiring) return;
  const oldHomeRoot = rootStock('W0N1'), oldRoot = oldHomeRoot+rootStock('W1N1');
  Memory.empirePolicyChange = { tick: Game.time,mode,cargo,receipts: labReceiptTotal('W0N1'),oldWindow,oldRoot,oldHomeRoot };
  if (mode === 'pause') { industry.labs.setReactionsPaused(true); return; }
  if (mode === 'participant') industry.labs.configure('W0N1',{ labProductionScope: 'room',labReactionsEnabled: false });
  else {
    const policy = { labProductionTargets: [{ product: 'UH',amount: 15,priority: 0 }] };
    if (!industry.labs.previewEmpire(policy).ok || !industry.labs.configureEmpire(policy).changed) throw new Error('Shared lab operator policy change failed');
    if (JSON.stringify(industry.labs.inspectEmpire().values.labProductionTargets) !== JSON.stringify(policy.labProductionTargets)) throw new Error('Shared lab operator inspection failed');
  }
}
function rootStock(home: string): number {
  const room = Game.rooms[home]!, labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  return room.storage!.store.getUsedCapacity(RESOURCE_UTRIUM_ACID)+labs.reduce((sum,lab) => sum+lab.store.getUsedCapacity(RESOURCE_UTRIUM_ACID),0)
    +Object.values(Game.creeps).filter(creep => creep.room.name === home).reduce((sum,creep) => sum+creep.store.getUsedCapacity(RESOURCE_UTRIUM_ACID),0);
}
