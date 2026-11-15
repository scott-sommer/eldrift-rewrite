import { standardCandidateBatch } from '../../capabilities/planning/standard-candidate-batch';
import { constrainedCandidateBatch } from '../../capabilities/planning/constrained-candidate-batch';
import type { CandidateSeeds, CoreCandidate } from '../../capabilities/planning/standard-candidates';
import type { AnchorOptions } from '../../capabilities/planning/constrained-anchors';
import type { CandidateCheckpoint } from '../../capabilities/planning/candidate-batch';
import type { PlanningCandidate, PlanningJobInput } from './planning-job-model';
import { copyPlain } from '../../persistence/plain-data';
export interface EnumerationOptions { standard?: CandidateSeeds; constrained?: AnchorOptions }
export interface EnumerationCheckpoint {
  version: 1; signature: string; candidates: PlanningCandidate[];
  standard?: CandidateCheckpoint; constrained?: CandidateCheckpoint;
}
/** Enumerates all enabled strategies under one raw-attempt budget; only completion exposes a job source. */
export function enumeratePlanningCandidates(
  options: EnumerationOptions, previous: EnumerationCheckpoint | undefined,
  maximumAttempts: number, canContinue: () => boolean = () => true,
) {
  if (!Number.isSafeInteger(maximumAttempts) || maximumAttempts < 0) throw new Error('Invalid enumeration budget');
  const signature = 'planning-candidates-v1:' + JSON.stringify(options);
  const checkpoint = previous ? copyPlain(previous) : { version: 1 as const, signature, candidates: [] };
  if (checkpoint.version !== 1 || checkpoint.signature !== signature) throw new Error('Stale candidate enumeration');
  validateCandidates(checkpoint.candidates);
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
  return { done: true as const, checkpoint, attempts, source: candidateSource(checkpoint) };
}
function append(target: PlanningCandidate[], strategy: string, candidates: readonly CoreCandidate[]): void {
  for (const candidate of candidates) target.push({ ...candidate, strategy,
    id: candidateId(strategy, candidate) });
  if (target.length > 10000) throw new Error('Too many planning candidates');
}
function candidateId(strategy: string, candidate: CoreCandidate): string {
  return strategy + ':' + candidate.anchor.x + ':' + candidate.anchor.y + ':' + candidate.transform;
}
function validateCandidates(candidates: readonly PlanningCandidate[]): void {
  if (!Array.isArray(candidates) || candidates.length > 10000) throw new Error('Invalid enumerated candidates');
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (!['standard', 'constrained'].includes(candidate.strategy) || candidate.id !== candidateId(candidate.strategy, candidate)
      || ids.has(candidate.id)) throw new Error('Invalid enumerated candidate identity');
    ids.add(candidate.id);
  }
}
function candidateSource(checkpoint: EnumerationCheckpoint): PlanningJobInput['source'] {
  const candidates = copyPlain(checkpoint.candidates);
  return { revision: checkpoint.signature, count: candidates.length,
    at(index: number) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= candidates.length) throw new Error('Invalid planning candidate ordinal');
      return copyPlain(candidates[index]!);
    } };
}
