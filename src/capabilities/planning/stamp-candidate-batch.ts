import { constrainedAnchors } from './constrained-anchors';
import type { AnchorOptions } from './constrained-anchors';
import { candidateBatch } from './candidate-batch';
import type { CandidateCheckpoint } from './candidate-batch';
import { insideRoom } from '../../core/geometry/local-grid';
/** Hub candidates only; each stamp searches its own transforms during composition. */
export function stampCandidateBatch(
  options: AnchorOptions, checkpoint: CandidateCheckpoint | undefined, maximumAttempts: number,
  canContinue: () => boolean = () => true,
) {
  const anchors = constrainedAnchors(options);
  return candidateBatch({ count: anchors.length,
    at: ordinal => ({ anchor: { ...anchors[ordinal]! }, transform: 0 }) },
  'stamp-hubs-v1:' + JSON.stringify(options), candidate => insideRoom(candidate.anchor, 2),
  checkpoint, maximumAttempts, canContinue);
}
