import { observeTransfer } from '../../../../adapters/screeps/transfer-observation';
import type { StatePort } from '../../../../persistence/versioned-state';
import { createNativePaidCourierObservation } from './native';
import { resolvePaidCourierOpening } from './opening';
import type { PaidCourierContext } from './model';
import type { PaidCourierOpeningResult } from './opening-model';
/** Called before any actor dispatch; reads native events without settling the existing journal owner. */
export function createNativePaidCourierOpening(state: StatePort) {
  const observe = createNativePaidCourierObservation(state);
  return (context: PaidCourierContext,guard: () => boolean = () => true): PaidCourierOpeningResult => {
    const current = observe(context,guard); if (current.status === 'deferred') return current;
    const journal = current.observation.journal;
    const witness = journal?.attempt && !journal.acknowledged && !journal.result ? observeTransfer(journal.attempt) : undefined;
    if (!guard()) return { status: 'deferred',reason: 'budget' };
    return resolvePaidCourierOpening(current.observation,witness);
  };
}
