import { enumerateCompactCandidates } from './compact-candidate-enumeration';
import { enumerationSignature } from './candidate-enumeration';
import type { EnumerationOptions } from './candidate-enumeration';
import type { createEnumerationStore } from './enumeration-store';
/** Persist the whole batch before exposing its source to the scoring lifecycle. */
export function runEnumerationCycle(
  store: ReturnType<typeof createEnumerationStore>, options: EnumerationOptions,
  maximumAttempts: number, canContinue: () => boolean = () => true,
) {
  if (!Number.isSafeInteger(maximumAttempts) || maximumAttempts < 0) throw new Error('Invalid enumeration budget');
  let saved = store.readCompact();
  if (saved.checkpoint && saved.checkpoint.signature !== enumerationSignature(options)) {
    const cleared = store.clear(saved.revision);
    if (!cleared.ok) return { status: 'conflict' as const };
    saved = cleared.record;
  }
  const result = enumerateCompactCandidates(options, saved.checkpoint, maximumAttempts, canContinue);
  if (!saved.checkpoint || result.attempts > 0) {
    if (!store.saveCompact(saved.revision, result.checkpoint).ok) return { status: 'conflict' as const };
  }
  return { ...result, status: result.done ? 'ready' as const : 'pending' as const };
}
