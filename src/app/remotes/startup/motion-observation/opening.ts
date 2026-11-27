import { copyPlain } from '../../../../core/plain-data';
import { confirmTransfer } from '../../../../capabilities/logistics/confirmation';
import type { TransferObservation,TransferConfirmation } from '../../../../capabilities/logistics/confirmation';
import type { PaidCourierObservation } from './model';
import type { PaidCourierOpeningResult } from './opening-model';
/** Only for a before-dispatch boundary: past native effects are already in opening stock, never new income. */
export function resolvePaidCourierOpening(input: PaidCourierObservation,witness?: TransferObservation): PaidCourierOpeningResult {
  const observed = copyPlain(input);
  if (observed.stage !== 'pending') return ordinary(observed);
  return pending(observed,witness);
}
function pending(observed: PaidCourierObservation,witness: TransferObservation | undefined): PaidCourierOpeningResult {
  const facts = effectFacts(observed,witness); if ('reason' in facts) return deferred(facts.reason);
  const quantities = remainingAfter(observed,facts.amount); if ('reason' in quantities) return deferred(quantities.reason);
  const stage = quantities.remaining === 0 ? 'completion' : observed.energy > 0 ? 'deliver' : 'collect';
  const readyAt = Math.max(observed.observedAt,observed.task!.wakeAt)+(stage === 'completion' ? 1 : 0);
  const attempt = observed.journal!.attempt!;
  return { status: 'ready',opening: { observed,continuation: { stage,readyAt,requestRemaining: quantities.remaining },
    reflectedEffect: { id: attempt.id,kind: facts.kind,amount: facts.amount,issuedAt: attempt.tick,postedAmount: quantities.posted,projectedIncome: 0 } } };
}
function effectFacts(observed: PaidCourierObservation,witness: TransferObservation | undefined): { amount: number; kind: 'withdraw' | 'transfer' } | { reason: string } {
  const journal = observed.journal,attempt = journal?.attempt;
  if (!journal || journal.acknowledged || !attempt || !observed.task) return { reason: 'courier-opening-journal' };
  if (attempt.tick >= observed.observedAt) return { reason: 'courier-opening-current-intent' };
  const result = confirmation(observed,witness);
  if (result?.status !== 'observed') return { reason: 'courier-opening-pending-or-unknown' };
  if (attempt.kind === 'pickup' || !cargoMatches(observed,result.amount)) return { reason: 'courier-opening-cargo' };
  return { amount: result.amount,kind: attempt.kind };
}
function remainingAfter(observed: PaidCourierObservation,amount: number): { posted: number; remaining: number } | { reason: string } {
  const task = observed.task!,attempt = observed.journal!.attempt!;
  const posted = task.receipts.find(receipt => receipt.id === attempt.id)?.amount ?? 0;
  if (posted !== 0 && posted !== amount) return { reason: 'courier-opening-receipt' };
  if (attempt.kind === 'withdraw' && posted !== 0) return { reason: 'courier-opening-withdraw-receipt' };
  const remaining = task.remaining-(attempt.kind === 'transfer' && posted === 0 ? amount : 0);
  if (remaining < 0 || remaining === 0 && observed.energy > 0) return { reason: 'courier-opening-task-cargo' };
  return { posted,remaining };
}

function ordinary(observed: PaidCourierObservation): PaidCourierOpeningResult {
  const stage = observed.stage as Exclude<PaidCourierObservation['stage'],'pending'>;
  const readyAt = stage === 'spawning' ? observed.activeAt : Math.max(observed.observedAt,observed.task?.wakeAt ?? observed.observedAt)+(stage === 'completion' ? 1 : 0);
  return { status: 'ready',opening: { observed,continuation: { stage,readyAt,requestRemaining: observed.task?.remaining ?? null } } };
}
function confirmation(observed: PaidCourierObservation,witness: TransferObservation | undefined): TransferConfirmation | null {
  const journal = observed.journal!;
  if (journal.result) return journal.result;
  if (!witness || witness.tick !== observed.observedAt || witness.cargo !== observed.energy) return null;
  return confirmTransfer(journal.attempt!,witness);
}
function cargoMatches(observed: PaidCourierObservation,amount: number): boolean {
  const attempt = observed.journal!.attempt!;
  const expected = attempt.cargoBefore+(attempt.kind === 'withdraw' ? amount : -amount);
  return expected >= 0 && expected === observed.energy;
}
function deferred(reason: string): PaidCourierOpeningResult { return { status: 'deferred',reason }; }
