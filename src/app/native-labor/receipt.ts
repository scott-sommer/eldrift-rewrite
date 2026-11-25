import type { LaborProgress } from '../../features/work/labor-progress';
import type { LaborTaskPayload } from '../../features/work/labor-task';
import type { UnitIdentity } from '../../persistence/units/schema';
declare global {
  interface CreepMemory { startupLaborReceipt?: { request: string; unit: string; observedAt: number; completedAt: number; picked: number; spent: number; returned: number } }
}
export function recordNativeLaborReceipt(unit: Creep, progress: Readonly<LaborProgress>, payload: LaborTaskPayload): void {
  unit.memory.startupLaborReceipt = { request: payload.proposal.input.request.id,unit: unit.id,observedAt: payload.proposal.observedAt,completedAt: Game.time,picked: progress.picked,spent: progress.spent,returned: progress.returned };
}
/** Preserve replacement metadata when an old identity is retired under the same name. */
export function withLaborReceiptRetirement(before: (unit: UnitIdentity) => void) {
  return (unit: UnitIdentity): void => {
    before(unit);
    const memory = Memory.creeps?.[unit.name];
    if (memory?.startupLaborReceipt?.unit === unit.id) delete memory.startupLaborReceipt;
  };
}
