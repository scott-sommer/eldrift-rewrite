import type { StatePort } from '../persistence/versioned-state';
import type { createNativeGroundDelivery } from './native-ground-delivery';
import { createTransferJournal } from '../features/logistics/transfer-journal';
import { observeTransfer } from '../adapters/screeps/transfer-observation';
import { createGroundJournal } from '../features/logistics/ground-journal';
/** Settlement consumes a tick; the next cycle is always based on newly observed cargo. */
export function settleSupplyCycle(state: StatePort, creep: Creep, ground: ReturnType<typeof createNativeGroundDelivery>): boolean {
  const journal = createTransferJournal(state, creep.id);
  const current = journal.read();
  if (current.attempt && !current.acknowledged) {
    const result = journal.settle(observeTransfer(current.attempt));
    if (result && result.status !== 'waiting') {
      journal.acknowledge(current.attempt.id);
      if (result.status === 'unknown') journal.retireUnknown(current.attempt.id);
    }
    return true;
  }
  const dropped = createGroundJournal(state, creep.id);
  const pending = dropped.read();
  if (!pending.attempt || pending.acknowledged) return false;
  const result = ground.settle(creep.id);
  if (result?.status === 'released') dropped.acknowledge(pending.attempt.id);
  if (result?.status === 'unknown') ground.recover(creep);
  return true;
}
