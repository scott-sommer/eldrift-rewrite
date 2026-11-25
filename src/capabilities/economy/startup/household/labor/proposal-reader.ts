import { copyPlain } from '../../../../../core/plain-data';
import { validateRequest } from '../../../../spawning/allocate';
import { createLaborProposal } from './proposal';
import type { LaborProposalSnapshot } from './proposal';
import { quoteLaborTravel } from './travel';
import { natural } from './validation';
/** Validate canonical recorded evidence; this never restores native freshness or execution authority. */
export function readLaborProposalSnapshot(value: unknown): LaborProposalSnapshot {
  const saved = copyPlain(value) as LaborProposalSnapshot;
  if (JSON.stringify(saved).length > 262144) throw new Error('Labor proposal snapshot capacity');
  validateLinks(saved);
  const identity: unknown = JSON.parse(saved.route.identity);
  if (!Array.isArray(identity) || identity.length !== 2 || JSON.stringify(identity[0]) !== JSON.stringify(saved.route.plan)) throw new Error('Labor route identity mismatch');
  const proposal = createLaborProposal({ now: () => saved.observedAt,observe: () => ({ status: 'observed',facts: saved.facts }),
    travel: plan => quoteLaborTravel(plan,identity[1],leg => {
      const measured = saved.route.legs.find(item => item.kind === leg.kind);
      if (!measured) throw new Error('Missing recorded labor leg');
      return { ...measured,status: 'complete' };
    }),
  })(saved.input);
  if (proposal.status !== 'ready') throw new Error('Unusable recorded labor proposal');
  const rebuilt = proposal.read();
  if (JSON.stringify(rebuilt) !== JSON.stringify(saved)) throw new Error('Noncanonical labor proposal snapshot');
  return rebuilt;
}
function validateLinks(saved: LaborProposalSnapshot): void {
  const { input,facts } = saved; validateRequest(input.request);
  if (saved.observedAt !== input.observedAt || facts.spawn.id !== input.birth.spawn || facts.source.id !== input.source) throw new Error('Labor proposal source/birth link');
  if (facts.target.id !== input.order.id || facts.target.kind !== input.order.kind || JSON.stringify(facts.target.position) !== JSON.stringify(input.order.position)) throw new Error('Labor proposal target link');
  const source = facts.source;
  if (![source.energy,source.capacity,source.freeCapacity,source.claimedEnergy,source.claimedCapacity,source.availableEnergy,facts.target.remainingWork].every(natural)) throw new Error('Invalid labor proposal recorded quantities');
  if (source.energy+source.freeCapacity > source.capacity || source.availableEnergy !== Math.max(0,source.energy-source.claimedEnergy)) throw new Error('Invalid labor proposal recorded stock');
}
