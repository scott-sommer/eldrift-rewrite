import { standardCandidateSource } from './standard-candidate-source';
import type { CandidateSeeds } from './standard-candidates';
import { placeTemplate } from './template';
import { standardTemplate } from './standard-template';
import { candidateBatch } from './candidate-batch';
import type { CandidateCheckpoint } from './candidate-batch';
export type { CandidateCheckpoint } from './candidate-batch';
export function standardCandidateBatch(
  seeds: CandidateSeeds, checkpoint: CandidateCheckpoint | undefined, maximumAttempts: number,
  canContinue: () => boolean = () => true,
) {
  return candidateBatch(standardCandidateSource(seeds), JSON.stringify(seeds),
    candidate => !!placeTemplate(standardTemplate, candidate.anchor, candidate.transform),
    checkpoint, maximumAttempts, canContinue);
}
