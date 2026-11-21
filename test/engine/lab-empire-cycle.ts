import { prepareEmpireLoss, recordEmpireLoss } from './lab-empire-loss';
import { changeEmpirePolicy, labReceiptTotal } from './lab-empire-change';
import { industry, loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { haulingOwner } from '../../src/features/logistics/identity';
import { createEmpireProductionStore } from '../../src/features/industry/empire-production/store';
import type { EmpireProductionWindow } from '../../src/features/industry/empire-production/model';
interface EmpireRoomRow { bankUH: number; carriedUH: number; receipts: number; home: string; bank: number; rootInLabs: number; cargo: number; courier: string; reactionLabs: string[]; buffer: { id: string; mineral: string | null; amount: number; energy: number } }
declare global { interface Memory { empireProductionRows?: { tick: number; total: number; windows: EmpireProductionWindow[]; rooms: EmpireRoomRow[] }[] } }
const state = createMemoryPort(() => Memory);
export function runEmpireProduction(mode: 'normal' | 'policy' | 'participant' | 'loss'): void {
  if (!Memory.empireProductionRows) {
    const settings = openState(state,'operator/config',operatorSchema);
    settings.empire = { logisticsEnabled: true,workersEnabled: false,labReactionsEnabled: true,labProductionScope: 'empire',
      labProductionTargets: [{ product: 'UH2O',amount: 15,priority: 0 }],labProductionBatch: 10,labTransportBatch: 20 };
    saveState(state,'operator/config',operatorSchema,settings);
    industry.labs.configureMany(['W0N1','W1N1'].map(home => ({ home,input: { labBoostRoles: [{ lab: bufferLab(home).id,resource: 'XGH2O',mineral: 60,energy: 40 }] } })));
  }
  for (const creep of Object.values(Game.creeps).filter(item => item.name.startsWith('boost-courier'))) creep.memory.population = { owner: haulingOwner(creep.room.name),home: creep.room.name };
  if (mode === 'loss') prepareEmpireLoss(); else changeEmpirePolicy(mode);
  botLoop(); const rooms = ['W0N1','W1N1'].map(roomRow);
  (Memory.empireProductionRows ??= []).push({ tick: Game.time,total: rooms.reduce((sum,room) => sum+room.bank+room.rootInLabs,0),windows: createEmpireProductionStore(state,() => false).list(),rooms });
  if (mode === 'loss') recordEmpireLoss();
}
function bufferLab(home: string): StructureLab {
  return Game.rooms[home]!.find(FIND_STRUCTURES).find((item): item is StructureLab => item.structureType === STRUCTURE_LAB && item.pos.x === 17 && item.pos.y === 20)!;
}
function roomRow(home: string): EmpireRoomRow {
  const room = Game.rooms[home]!, lab = bufferLab(home), report = industry.labs.inspect(home);
  const courierName = home === 'W0N1' ? 'boost-courier' : 'boost-courier-second', courier = Game.creeps[courierName];
  const labs = room.find(FIND_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  return { home,bankUH: room.storage!.store.getUsedCapacity(RESOURCE_UTRIUM_HYDRIDE),carriedUH: labs.reduce((sum,item) => sum+item.store.getUsedCapacity(RESOURCE_UTRIUM_HYDRIDE),0)+(courier?.store.getUsedCapacity(RESOURCE_UTRIUM_HYDRIDE) ?? 0),receipts: labReceiptTotal(home),bank: room.storage!.store.getUsedCapacity(RESOURCE_UTRIUM_ACID),rootInLabs: labs.reduce((sum,item) => sum+item.store.getUsedCapacity(RESOURCE_UTRIUM_ACID),0)+(courier?.store.getUsedCapacity(RESOURCE_UTRIUM_ACID) ?? 0),
    cargo: courier?.store.getUsedCapacity() ?? 0,courier: courierName,reactionLabs: report.assignment ? [...report.assignment.inputs,...report.assignment.outputs] : [],
    buffer: { id: lab.id,mineral: lab.mineralType ?? null,amount: lab.mineralAmount ?? 0,energy: lab.store.getUsedCapacity(RESOURCE_ENERGY) } };
}
