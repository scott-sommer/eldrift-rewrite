import { materializeQuotedBirth } from '../population/quoted-birth';
import type { LaborProposalSnapshot } from '../../capabilities/economy/startup/household/labor/proposal';
export function materializeLaborBirth(proposal: LaborProposalSnapshot, tick: number, publication = false) {
  const materialized = materializeQuotedBirth(proposal.input.request,proposal.input.birth,proposal.observedAt,tick);
  if (materialized.status !== 'ready') return materialized;
  return { ...materialized,request: { ...materialized.request,admission: { kind: 'household-labor' as const,task: 'household-labor:'+proposal.input.request.id,...(publication ? { publication: true as const } : {}) } } };
}
