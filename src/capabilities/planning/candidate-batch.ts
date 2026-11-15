import type { CoreCandidate } from './standard-candidates';
export interface CandidateCheckpoint { version: 1; signature: string; next: number; seen: string[] }
export interface CandidateSource { count: number; at: (ordinal: number) => CoreCandidate | undefined }
export function candidateBatch(
  source: CandidateSource, signature: string, accept: (candidate: CoreCandidate) => boolean,
  checkpoint: CandidateCheckpoint | undefined, maximumAttempts: number, canContinue: () => boolean = () => true,
) {
  if (!Number.isSafeInteger(maximumAttempts) || maximumAttempts < 0) throw new Error('Invalid candidate budget');
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
    if (accept(candidate)) candidates.push(candidate);
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
