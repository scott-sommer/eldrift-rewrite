import { verifyEmpireOperatorBoundaries } from './lab-empire-operator';
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
declare global { interface Memory { empireProductionRows?: { tick: number; paused: boolean; products: Record<string,number>; total: number; windows: EmpireProductionWindow[]; rooms: EmpireRoomRow[] }[] } }
const state = createMemoryPort(() => Memory);
export function runEmpireProduction(mode: 'normal' | 'policy' | 'participant' | 'loss' | 'intel' | 'pause'): void {
  if (!Memory.empireProductionRows) {
    const settings = openState(state,'operator/config',operatorSchema);
    settings.empire = { logisticsEnabled: true,workersEnabled: false };
    if (mode === 'intel') settings.empire = { ...settings.empire as object,intelEnabled: true,intelCaptureInterval: 1,intelCaptureCpuBudget: 100,intelCaptureRooms: 4,intelCaptureScans: 32 };
    saveState(state,'operator/config',operatorSchema,settings);
    const policy = { labReactionsEnabled: true,labProductionScope: 'empire' as const,labProductionTargets: industry.labs.legacyTargets({ upgradeProduct: 'UH2O',amounts: { XZHO2: 0,XLHO2: 0,XZH2O: 0,XLH2O: 0,XUH2O: 0,XKHO2: 0,XGHO2: 0,BOOST: 15 } }),labProductionBatch: 10,labTransportBatch: 20 };
    if (!industry.labs.previewEmpire(policy).ok || !industry.labs.configureEmpire(policy).changed || industry.labs.configureEmpire(policy).changed) throw new Error('Shared lab operator admission/replay failed');
    verifyEmpireOperatorBoundaries();
    if (mode === 'pause') industry.labs.configureMany(['W0N1','W1N1'].map(home => ({ home,input: { labReactionsEnabled: true } })));
    industry.labs.configureMany(['W0N1','W1N1'].map(home => ({ home,input: { labBoostRoles: [{ lab: bufferLab(home).id,resource: 'XGH2O',mineral: 60,energy: 40 }] } })));
  }
  for (const creep of Object.values(Game.creeps).filter(item => item.name.startsWith('boost-courier'))) creep.memory.population = { owner: haulingOwner(creep.room.name),home: creep.room.name };
  if (mode === 'loss' || mode === 'intel') prepareEmpireLoss(); else changeEmpirePolicy(mode);
  botLoop(); const rooms = ['W0N1','W1N1'].filter(home => !!Game.rooms[home]).map(roomRow);
  (Memory.empireProductionRows ??= []).push({ tick: Game.time,paused: industry.labs.reactionsStatus().paused,products: reactionStocks(),total: rooms.reduce((sum,room) => sum+room.bank+room.rootInLabs,0),windows: createEmpireProductionStore(state,() => false).list(),rooms });
  if (mode === 'loss' || mode === 'intel') recordEmpireLoss();
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

function reactionStocks(): Record<string,number> {
  const stores = Object.values(Game.rooms).flatMap(room => [room.storage,...room.find(FIND_MY_STRUCTURES).filter(item => item.structureType === STRUCTURE_LAB)]).filter((item): item is StructureStorage | StructureLab => !!item);
  const cargo = Object.values(Game.creeps).map(creep => creep.store);
  return Object.fromEntries(['OH','UH','UH2O'].map(resource => [resource,[...stores.map(item => item.store),...cargo].reduce((sum,store) => sum+store.getUsedCapacity(resource as ResourceConstant),0)]));
}
