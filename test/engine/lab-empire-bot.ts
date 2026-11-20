import { industry, loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { haulingOwner } from '../../src/features/logistics/identity';
import { createEmpireProductionStore } from '../../src/features/industry/empire-production/store';
import type { EmpireProductionWindow } from '../../src/features/industry/empire-production/model';
interface EmpireRoomRow { home: string; bank: number; rootInLabs: number; cargo: number; courier: string; reactionLabs: string[]; buffer: { id: string; mineral: string | null; amount: number; energy: number } }
declare global { interface Memory { empireProductionRows?: { tick: number; total: number; windows: EmpireProductionWindow[]; rooms: EmpireRoomRow[] }[] } }
const state = createMemoryPort(() => Memory);
export function loop(): void {
  if (!Memory.empireProductionRows) {
    const settings = openState(state,'operator/config',operatorSchema);
    settings.empire = { logisticsEnabled: true,workersEnabled: false,labReactionsEnabled: true,labProductionScope: 'empire',
      labProductionTargets: [{ product: 'UH2O',amount: 15,priority: 0 }],labProductionBatch: 10,labTransportBatch: 20 };
    saveState(state,'operator/config',operatorSchema,settings);
    industry.labs.configureMany(['W0N1','W1N1'].map(home => ({ home,input: { labBoostRoles: [{ lab: bufferLab(home).id,resource: 'XGH2O',mineral: 60,energy: 40 }] } })));
  }
  for (const creep of Object.values(Game.creeps)) creep.memory.population = { owner: haulingOwner(creep.room.name),home: creep.room.name };
  botLoop(); const rooms = ['W0N1','W1N1'].map(roomRow);
  (Memory.empireProductionRows ??= []).push({ tick: Game.time,total: rooms.reduce((sum,room) => sum+room.bank+room.rootInLabs,0),windows: createEmpireProductionStore(state,() => false).list(),rooms });
}
function bufferLab(home: string): StructureLab {
  return Game.rooms[home]!.find(FIND_MY_STRUCTURES).find((item): item is StructureLab => item.structureType === STRUCTURE_LAB && item.pos.x === 17 && item.pos.y === 20)!;
}
function roomRow(home: string): EmpireRoomRow {
  const room = Game.rooms[home]!, lab = bufferLab(home), report = industry.labs.inspect(home);
  const courier = Object.values(Game.creeps).find(creep => creep.room.name === home)!;
  const labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  return { home,bank: room.storage!.store.getUsedCapacity(RESOURCE_UTRIUM_ACID),rootInLabs: labs.reduce((sum,item) => sum+item.store.getUsedCapacity(RESOURCE_UTRIUM_ACID),0)+courier.store.getUsedCapacity(RESOURCE_UTRIUM_ACID),
    cargo: courier.store.getUsedCapacity(),courier: courier.name,reactionLabs: report.assignment ? [...report.assignment.inputs,...report.assignment.outputs] : [],
    buffer: { id: lab.id,mineral: lab.mineralType ?? null,amount: lab.mineralAmount ?? 0,energy: lab.store.getUsedCapacity(RESOURCE_ENERGY) } };
}
