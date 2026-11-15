import { stampCandidateBatch } from '../../capabilities/planning/stamp-candidate-batch';
import { copyPlain } from '../../persistence/plain-data';
import { standardCandidateBatch } from '../../capabilities/planning/standard-candidate-batch';
import { constrainedCandidateBatch } from '../../capabilities/planning/constrained-candidate-batch';
import type { CoreCandidate } from '../../capabilities/planning/standard-candidates';
import { enumerationSignature } from './enumeration-identity';
import type { EnumerationOptions } from './candidate-enumeration';
import { candidateFromId, validCompactEnumeration } from './compact-enumeration';
import type { CompactEnumeration } from './compact-enumeration';
import type { PlanningJobInput } from './planning-job-model';
/** Runtime resumes compact IDs; only source.at expands an individual candidate for evaluation. */
export function enumerateCompactCandidates(
  options: EnumerationOptions, previous: CompactEnumeration | undefined,
  maximumAttempts: number, canContinue: () => boolean = () => true,
) {
  if (!Number.isSafeInteger(maximumAttempts) || maximumAttempts < 0) throw new Error('Invalid enumeration budget');
  const signature = enumerationSignature(options);
  const checkpoint = previous ? copyPlain(previous) : { version: 1 as const, signature, candidates: [] };
  if (checkpoint.version !== 1 || checkpoint.signature !== signature) throw new Error('Stale candidate enumeration');
  if (!validCompactEnumeration(checkpoint)) throw new Error('Invalid candidate enumeration');
  let attempts = 0;
  if (options.standard) {
    const result = standardCandidateBatch(options.standard, checkpoint.standard, maximumAttempts, canContinue);
    checkpoint.standard = result.checkpoint;
    append(checkpoint.candidates, 'standard', result.candidates);
    attempts += result.attempts;
    if (!result.done) return { done: false as const, checkpoint, attempts };
  }
  if (options.constrained) {
    const result = constrainedCandidateBatch(options.constrained, checkpoint.constrained, maximumAttempts - attempts, canContinue);
    checkpoint.constrained = result.checkpoint;
    append(checkpoint.candidates, 'constrained', result.candidates);
    attempts += result.attempts;
    if (!result.done) return { done: false as const, checkpoint, attempts };
  }
  if (options.stamps) {
    const result = stampCandidateBatch(options.stamps, checkpoint.stamps, maximumAttempts - attempts, canContinue);
    checkpoint.stamps = result.checkpoint;
    append(checkpoint.candidates, 'stamps', result.candidates);
    attempts += result.attempts;
    if (!result.done) return { done: false as const, checkpoint, attempts };
  }
  return { done: true as const, checkpoint, attempts, source: candidateSource(checkpoint) };
}
function append(target: string[], strategy: string, candidates: readonly CoreCandidate[]): void {
  for (const candidate of candidates) target.push(strategy + ':' + candidate.anchor.x + ':' + candidate.anchor.y + ':' + candidate.transform);
  if (target.length > 10000) throw new Error('Too many planning candidates');
}
function candidateSource(checkpoint: CompactEnumeration): PlanningJobInput['source'] {
  const ids = [...checkpoint.candidates];
  return { revision: checkpoint.signature, count: ids.length, at(index) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= ids.length) throw new Error('Invalid planning candidate ordinal');
    return candidateFromId(ids[index]!);
  } };
}
