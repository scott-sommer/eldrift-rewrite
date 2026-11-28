import type { StatePort } from '../../../../../persistence/versioned-state';
import type { Journal } from '../../../../../features/logistics/transfer-journal';
import type { TransferAttempt } from '../../../../../capabilities/logistics/confirmation';
import { createTransferJournal } from '../../../../../features/logistics/transfer-journal';
import type { EnergyEffect } from '../../../../../capabilities/resources/energy-inventory/model';
export function validatePendingInventoryUnit(effects: readonly EnergyEffect[],state: StatePort,unit: string,nextTick?: number): void {
  const journal = createTransferJournal(state,unit).peek();
  const own = effects.filter(effect => (effect.kind === 'transfer' || effect.kind === 'withdraw') && (effect.kind === 'withdraw' ? effect.target : effect.source) === unit);
  validateEffectJournals(own,journal);
  if (!journal?.attempt || journal.acknowledged || journal.result !== null) return;
  // An expired event window resumes as unknown; it cannot supply a confirmed delivery.
  if (nextTick !== undefined && journal.attempt.tick < nextTick-1) return;
  validatePendingEffect(effects,journal.attempt,unit);
}
function validateEffectJournals(effects: readonly EnergyEffect[],journal: Journal | undefined): void {
  if (effects.some(effect => journal?.attempt?.id !== effect.id || journal.acknowledged)) throw new Error('Missing home checkpoint pending journal');
}
function validatePendingEffect(effects: readonly EnergyEffect[],attempt: TransferAttempt,unit: string): void {
  const effect = effects.find(effect => effect.id === attempt.id);
  if (!effect || effect.kind !== attempt.kind || effect.issuedAt !== attempt.tick) throw new Error('Missing home checkpoint pending effect');
  const source = attempt.kind === 'withdraw' ? attempt.target : unit;
  const target = attempt.kind === 'withdraw' ? unit : attempt.target;
  if (effect.source !== source || effect.target !== target || effect.amount > attempt.amount) throw new Error('Home checkpoint effect binding mismatch');
}

