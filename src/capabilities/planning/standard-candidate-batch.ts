import { standardCandidateSource } from './standard-candidate-source';
import type { CandidateSeeds, CoreCandidate } from './standard-candidates';
import { placeTemplate } from './template';
import { standardTemplate } from './standard-template';
export interface CandidateCheckpoint { version: 1; signature: string; next: number; seen: string[] }
export function standardCandidateBatch(
  seeds: CandidateSeeds, checkpoint: CandidateCheckpoint | undefined, maximumAttempts: number,
  canContinue: () => boolean = () => true,
) {
  if (!Number.isSafeInteger(maximumAttempts) || maximumAttempts < 0) throw new Error('Invalid candidate budget');
  const source = standardCandidateSource(seeds);
  const signature = JSON.stringify(seeds);
  validateCheckpoint(checkpoint, signature, source.count);
  const next: CandidateCheckpoint = checkpoint
    ? { ...checkpoint, seen: [...checkpoint.seen] } : { version: 1, signature, next: 0, seen: [] };
  const seen = new Set(next.seen), candidates: CoreCandidate[] = [];
  let attempts = 0;
  while (next.next < source.count && attempts < maximumAttempts && canContinue()) {
    const candidate = source.at(next.next);
    next.next++; attempts++;
    if (!candidate) continue;
    const key = candidate.anchor.x + ':' + candidate.anchor.y + ':' + candidate.transform;
    if (seen.has(key)) continue;
    seen.add(key); next.seen.push(key);
    if (placeTemplate(standardTemplate, candidate.anchor, candidate.transform)) candidates.push(candidate);
  }
  return { checkpoint: next, candidates, attempts, done: next.next === source.count };
}
function validateCheckpoint(checkpoint: CandidateCheckpoint | undefined, signature: string, count: number): void {
  if (!checkpoint) return;
  if (checkpoint.version !== 1 || checkpoint.signature !== signature) throw new Error('Stale candidate checkpoint');
  if (!Number.isSafeInteger(checkpoint.next) || checkpoint.next < 0 || checkpoint.next > count) throw new Error('Invalid candidate checkpoint');
  if (!Array.isArray(checkpoint.seen) || !checkpoint.seen.every(key => typeof key === 'string')
    || new Set(checkpoint.seen).size !== checkpoint.seen.length) throw new Error('Invalid candidate history');
}
