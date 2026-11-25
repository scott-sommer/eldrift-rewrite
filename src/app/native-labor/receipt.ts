import type { LaborProgress } from '../../features/work/labor-progress';
import type { LaborTaskPayload } from '../../features/work/labor-task';
import type { UnitIdentity } from '../../persistence/units/schema';
declare global {
  interface CreepMemory { startupLaborFailure?: { request: string; unit: string; reason: string; failedAt: number; resolvedAt: number; picked: number; spent: number; returned: number; retainedEnergy: number }; startupLaborReceipt?: { request: string; unit: string; observedAt: number; completedAt: number; picked: number; spent: number; returned: number } }
}
export function recordNativeLaborReceipt(unit: Creep, progress: Readonly<LaborProgress>, payload: LaborTaskPayload): void {
  unit.memory.startupLaborReceipt = { request: payload.proposal.input.request.id,unit: unit.id,observedAt: payload.proposal.observedAt,completedAt: Game.time,picked: progress.picked,spent: progress.spent,returned: progress.returned };
}
/** Preserve replacement metadata when an old identity is retired under the same name. */
export function withLaborReceiptRetirement(before: (unit: UnitIdentity) => void) {
  return (unit: UnitIdentity): void => {
    before(unit);
    const memory = Memory.creeps?.[unit.name];
    for (const key of ['startupLaborReceipt','startupLaborFailure'] as const) if (memory?.[key]?.unit === unit.id) delete memory[key];
  };
}

export function recordNativeLaborFailure(unit: Creep, progress: Readonly<LaborProgress>, payload: LaborTaskPayload, reason: string): void {
  unit.memory.startupLaborFailure = { request: payload.proposal.input.request.id,unit: unit.id,reason,failedAt: progress.failure?.tick ?? Game.time,resolvedAt: Game.time,picked: progress.picked,spent: progress.spent,returned: progress.returned,retainedEnergy: unit.store.energy };
}
