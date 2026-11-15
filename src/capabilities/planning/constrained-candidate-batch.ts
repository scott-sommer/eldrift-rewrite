import { constrainedAnchors } from './constrained-anchors';
import type { AnchorOptions } from './constrained-anchors';
import { constrainedFootprint } from './constrained-footprint';
import { candidateBatch } from './candidate-batch';
import type { CandidateCheckpoint, CandidateSource } from './candidate-batch';
import type { TransformIndex } from '../../core/geometry/transforms';
export function constrainedCandidateBatch(
  options: AnchorOptions, checkpoint: CandidateCheckpoint | undefined, maximumAttempts: number,
  canContinue: () => boolean = () => true,
) {
  const anchors = constrainedAnchors(options);
  const source: CandidateSource = {
    count: anchors.length * 8,
    at: ordinal => ({ anchor: { ...anchors[Math.floor(ordinal / 8)]! }, transform: (ordinal % 8) as TransformIndex }),
  };
  return candidateBatch(source, 'constrained-v1:' + JSON.stringify(options),
    candidate => !!constrainedFootprint(candidate.anchor, candidate.transform),
    checkpoint, maximumAttempts, canContinue);
}
