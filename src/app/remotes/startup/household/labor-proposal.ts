import { createLaborProposal } from '../../../../capabilities/economy/startup/household/labor/proposal';
import { createNativeLaborTravel } from './labor-travel';
import { createNativeLaborObservation } from './labor-observation';
import type { StatePort } from '../../../../persistence/versioned-state';
/** Fresh same-tick geometry/workload proposal; parent financial and execution owners retain authority. */
export function createNativeLaborProposal(state: StatePort, maximumOps: number) {
  return createLaborProposal({ now: () => Game.time,observe: createNativeLaborObservation(state),travel: createNativeLaborTravel(maximumOps) });
}
