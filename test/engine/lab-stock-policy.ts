import { industry,loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { haulingOwner } from '../../src/features/logistics/identity';
interface RoomRow { home: string; OH: number; UH: number; UH2O: number; bankRoot: number; cargo: number; step: ReturnType<typeof industry.labs.inspect>['production'] }
interface Row { tick: number; rooms: RoomRow[]; windows: ReturnType<typeof industry.labs.inspectEmpire>['windows'] }
declare global { interface Memory { stockPolicyRows?: Row[] } }
const state = createMemoryPort(() => Memory);
export function runStockPolicy(mode: 'shared' | 'local' | 'priority'): void {
  if (!Memory.stockPolicyRows) {
    const settings = openState(state,'operator/config',operatorSchema); settings.empire = { logisticsEnabled: true,workersEnabled: false }; saveState(state,'operator/config',operatorSchema,settings);
    const preset = industry.labs.legacyPolicy({ upgradeProduct: 'UH2O',amounts: { XZHO2: 0,XLHO2: 0,XZH2O: 0,XLH2O: 0,XUH2O: 0,XKHO2: 0,XGHO2: 0,BOOST: 15 } });
    industry.labs.configureEmpire({ ...preset,labProductionScope: mode === 'local' ? 'room' : 'empire',labReactionsEnabled: true,labIntermediateBase: mode === 'priority' ? 0 : 5,labIntermediatePerTerminal: mode === 'priority' ? 0 : 5,labProductionBatch: 10,labTransportBatch: 20,
      ...(mode === 'priority' ? { labProductionThresholds: [{ product: 'OH',amount: 5,priority: 0 },{ product: 'UH',amount: 5,priority: 1 },{ product: 'OH',amount: 15,priority: 2 }] } : {}) });
    industry.labs.configureMany(['W0N1','W1N1'].map(home => ({ home,input: { labBoostRoles: [{ lab: Game.rooms[home]!.find(FIND_MY_STRUCTURES).find(item => item.structureType === STRUCTURE_LAB && item.pos.x === 17 && item.pos.y === 20)!.id,resource: 'XGH2O',mineral: 60,energy: 40 }] } })));
  }
  for (const creep of Object.values(Game.creeps).filter(creep => creep.name.startsWith('boost-courier'))) creep.memory.population = { owner: haulingOwner(creep.room.name),home: creep.room.name };
  botLoop(); (Memory.stockPolicyRows ??= []).push({ tick: Game.time,rooms: ['W0N1','W1N1'].map(home => roomRow(home,mode)),windows: industry.labs.inspectEmpire().windows });
}
function roomRow(home: string,mode: string): RoomRow {
  const room = Game.rooms[home]!, banks = [room.storage!,room.terminal!], labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  const creeps = Object.values(Game.creeps).filter(creep => creep.room.name === home), stores = [...banks.map(bank => bank.store),...labs.map(lab => lab.store),...creeps.map(creep => creep.store)];
  const stock = (resource: ResourceConstant) => stores.reduce((sum,store) => sum+(store.getUsedCapacity(resource) ?? 0),0);
  return { home,OH: stock('OH'),UH: stock('UH'),UH2O: stock('UH2O'),bankRoot: banks.reduce((sum,bank) => sum+bank.store.getUsedCapacity(mode === 'priority' ? 'OH' : 'UH2O'),0),cargo: creeps.reduce((sum,creep) => sum+creep.store.getUsedCapacity(),0),step: industry.labs.inspect(home).production };
}
