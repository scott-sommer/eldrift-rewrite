import type { StartupDeliveryInput } from '../../delivery-model';
import type { LaborProposalInput } from './proposal-model';
export interface LaborCandidateSeed {
  base: StartupDeliveryInput;
  /** Endpoint identity from the parent native geometry binding, absent from the numerical sink model. */
  endpoint: string;
  proposal: Omit<LaborProposalInput,'birth'>;
}
