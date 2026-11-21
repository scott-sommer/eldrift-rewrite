import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createEmpireProductionStore } from '../../src/features/industry/empire-production/store';
import type { EmpireProductionWindow } from '../../src/features/industry/empire-production/model';
import { labReceiptTotal } from './lab-empire-change';
const state = createMemoryPort(() => Memory);
interface LossRow { intel: unknown; tick: number; visible: boolean; owned: boolean; alive: boolean; cargo: number; window: EmpireProductionWindow | null; assignment: unknown; receipts: number }
declare global { interface Memory {
  empireLossTrigger?: { tick: number; cargo: number; unit: string; window: EmpireProductionWindow; receipts: number };
  empireLossRows?: LossRow[];
} }
export function prepareEmpireLoss(): void {
  const witness = Game.creeps['ownership-witness'];
  if (witness) witness.memory.population = { owner: 'fixture-witness',home: 'W1N1' };
  const courier = Game.creeps['boost-courier'];
  const cargo = (courier?.store.getUsedCapacity(RESOURCE_HYDROGEN) ?? 0)+(courier?.store.getUsedCapacity(RESOURCE_UTRIUM) ?? 0);
  const window = createEmpireProductionStore(state,() => false).list().find(item => item.home === 'W0N1');
  if (!Memory.empireLossTrigger && cargo > 0 && window) Memory.empireLossTrigger = { tick: Game.time,cargo,unit: courier!.id,window,receipts: labReceiptTotal('W0N1') };
}
export function recordEmpireLoss(): void {
  const room = Game.rooms.W0N1, courier = Game.creeps['boost-courier'];
  (Memory.empireLossRows ??= []).push({ intel: state.read('intel/W0N1') ?? null,tick: Game.time,visible: !!room,owned: room?.controller?.my ?? false,alive: !!courier,cargo: courier?.store.getUsedCapacity() ?? 0,
    window: createEmpireProductionStore(state,() => false).list().find(item => item.home === 'W0N1') ?? null,assignment: state.read('industry-labs/W0N1'),receipts: labReceiptTotal('W0N1') });
}
