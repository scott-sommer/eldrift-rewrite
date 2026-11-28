import type { TransferAttempt,TransferObservation } from '../../../../capabilities/logistics/confirmation';
import type { EnergyInventoryFrame } from '../../../../capabilities/resources/energy-inventory/frame';
/** Missing actors supply no cargo fact; visibility controls event evidence, exactly as the SDK observer. */
export function observePhysicalTransfer(inventory: Pick<EnergyInventoryFrame,'tick' | 'observe' | 'effect'>,attempt: TransferAttempt,visible: boolean): TransferObservation {
  const unit = inventory.observe(attempt.unit),effect = inventory.effect(attempt.id);
  const events = effect && (effect.kind === 'transfer' || effect.kind === 'withdraw') && effect.amount > 0 ? [{ source: effect.source,target: effect.target,resource: 'energy',amount: effect.amount }] : [];
  return { tick: inventory.tick(),...(unit ? { cargo: unit.energy } : {}),...(visible ? { events } : {}) };
}
