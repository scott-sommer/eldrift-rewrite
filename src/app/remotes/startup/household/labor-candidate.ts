import { createLaborCandidate } from '../../../../capabilities/economy/startup/household/labor/candidate';
import { createNativeLaborProposal } from './labor-proposal';
import type { StatePort } from '../../../../persistence/versioned-state';
export function createNativeLaborCandidate(state: StatePort, maximumOps: number) {
  return createLaborCandidate(createNativeLaborProposal(state,maximumOps));
}
