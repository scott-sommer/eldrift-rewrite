import { candidateBatch } from './candidate-batch';
import type { CandidateCheckpoint } from './candidate-batch';
import type { CoreCandidate } from './standard-candidates';
import type { Tile } from '../../core/geometry/local-grid';
import { insideRoom } from '../../core/geometry/local-grid';
import type { TransformIndex } from '../../core/geometry/transforms';
import { placeStamp } from './stamp-placement';
import type { StampPlacementInput } from './stamp-placement';
export interface StampSearchInput extends Omit<StampPlacementInput, 'anchor' | 'transform'> {
  anchors: readonly Tile[];
  /** Binds observation and movement policy; change whenever either changes. */
  revision: string;
}
export interface StampMatch {
  candidate: CoreCandidate;
  placement: Extract<ReturnType<typeof placeStamp>, { ok: true }>;
}
/** Streams viable placements in anchor order, then transform order; caller owns composition/backtracking. */
export function searchStampBatch(
  input: StampSearchInput, previous: CandidateCheckpoint | undefined,
  maximumAttempts: number, canContinue: () => boolean = () => true,
) {
  validateSearch(input);
  const signature = JSON.stringify(['stamp-search-v1', input.revision, input.stamp,
    input.anchors, input.entries, input.corridors, input.claimed ?? []]);
  const matches: StampMatch[] = [];
  let lastRejection: { candidate: CoreCandidate; reason: string } | undefined;
  const source = { count: input.anchors.length * 8, at: (ordinal: number): CoreCandidate => ({
    anchor: { ...input.anchors[Math.floor(ordinal / 8)]! }, transform: (ordinal % 8) as TransformIndex,
  }) };
  const result = candidateBatch(source, signature, candidate => {
    const placement = placeStamp({ ...input, ...candidate });
    if (!placement.ok) { lastRejection = { candidate, reason: placement.reason }; return false; }
    matches.push({ candidate, placement });
    return true;
  }, previous, maximumAttempts, canContinue);
  return { checkpoint: result.checkpoint, matches, attempts: result.attempts,
    done: result.done, ...(lastRejection ? { lastRejection } : {}) };
}
function validateSearch(input: StampSearchInput): void {
  if (!input.revision || input.anchors.length > 2500 || !input.anchors.every(anchor => insideRoom(anchor))) {
    throw new Error('Invalid stamp search');
  }
}
