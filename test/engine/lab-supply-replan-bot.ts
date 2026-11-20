import { runLabSupply } from './lab-supply-cycle';
import { industry } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
declare global { interface Memory { labReplanRows?: { tick: number; pending: boolean; assignment: unknown; cargo: number }[]; labReplanRequest?: { tick: number; cargo: number; assignment: unknown; unchanged: boolean } } }
export function loop(): void {
  const state = createMemoryPort(() => Memory), courier = Game.creeps['lab-courier']!;
  if (!Memory.labReplanRequest && courier.store.getUsedCapacity() > 0) {
    const before = JSON.stringify(state.read('operator/config')), assignment = state.read('industry-labs/W0N1');
    industry.labs.requestReplan('W0N1');
    Memory.labReplanRequest = { tick: Game.time,cargo: courier.store.getUsedCapacity(),assignment,unchanged: before === JSON.stringify(state.read('operator/config')) };
  }
  runLabSupply('normal');
  (Memory.labReplanRows ??= []).push({ tick: Game.time,pending: industry.labs.replanStatus('W0N1').pending,assignment: state.read('industry-labs/W0N1'),cargo: courier.store.getUsedCapacity() });
}
