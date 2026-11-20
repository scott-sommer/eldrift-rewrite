import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { haulingOwner } from '../../src/features/logistics/identity';
import type { ProductionState } from '../../src/features/industry/production-state';
import type { LabState } from '../../src/features/industry/lab-state';
export type ChainMode = 'normal' | 'reserves' | 'priority' | 'depleted' | 'prestock';
interface Row { tick: number; step: string | null; root: string | null; goal: number | null; bank: Record<string,number>; pool: Record<string,number>; cargo: number; assignment: string | null }
declare global { interface Memory { labChain?: Row[] } }
const resources: readonly ResourceConstant[] = ['OH','UH','UH2O','ZH','XUH2O','X','K','H','O','U'];
export function runLabChain(mode: ChainMode): void {
  const room = Game.rooms['W0N1']!, courier = Game.creeps['lab-courier']!;
  courier.memory.population = { owner: haulingOwner(room.name),home: room.name };
  const state = createMemoryPort(() => Memory), settings = openState(state,'operator/config',operatorSchema);
  const targets = [{ product: 'UH2O',amount: 10,priority: 2 }];
  if (mode === 'priority') targets.push({ product: 'XUH2O',amount: 10,priority: 0 },{ product: 'ZH',amount: 5,priority: 1 });
  const reserve = ['reserves','prestock'].includes(mode) ? 5 : 0;
  settings.empire = { logisticsEnabled: true,labReactionsEnabled: true,labProductionTargets: targets,labProductionBatch: 10,
    labReagentReserve: reserve,labSupplyReserve: reserve,labTransportBatch: 30 };
  saveState(state,'operator/config',operatorSchema,settings);
  botLoop();
  const production = state.read('industry-production/W0N1') as { data: ProductionState };
  const assignment = state.read('industry-labs/W0N1') as { data: LabState } | undefined;
  const labs = room.find(FIND_MY_STRUCTURES).filter((item): item is StructureLab => item.structureType === STRUCTURE_LAB);
  const bank = Object.fromEntries(resources.map(resource => [resource,room.storage!.store.getUsedCapacity(resource)]));
  const pool = Object.fromEntries(resources.map(resource => [resource,(bank[resource] ?? 0)+courier.store.getUsedCapacity(resource)
    +labs.reduce((sum,lab) => sum+(lab.store.getUsedCapacity(resource) ?? 0),0)]));
  (Memory.labChain ??= []).push({ tick: Game.time,step: production.data.step?.product ?? null,root: production.data.step?.root ?? null,
    goal: production.data.step?.target ?? null,bank,pool,cargo: courier.store.getUsedCapacity(),assignment: assignment?.data.assignment?.product ?? null });
}
