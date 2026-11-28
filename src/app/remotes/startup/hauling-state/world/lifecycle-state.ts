import { validateTransferIncidents } from './uncertainty-state';
import { peekState } from '../../../../../persistence/versioned-state';
import type { StatePort } from '../../../../../persistence/versioned-state';
import { archiveSchema } from '../../../../../features/logistics/retire-unit';
/** Native archives preserve retired-ID evidence; body names cannot rebind an archived journal. */
export function validateHomeRetirementArchive(state: StatePort,nextTick: number): void {
  const archive = peekState(state,'logistics-retired/empire',archiveSchema);
  for (const entry of archive?.entries ?? []) {
    if (entry.journal?.attempt && entry.journal.attempt.unit !== entry.unit) throw new Error('Retired home journal binding mismatch');
    validateTransferIncidents(entry.incidents,entry.unit,nextTick);
  }
}
