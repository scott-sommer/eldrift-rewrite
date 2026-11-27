import { validateProjectHouseholdLinks } from './household-links';
import { validateProjectSourceLinks } from './source-links';
import { requireCheckpoint } from './validation';
import { receiptId } from './project-delivery';
import type { StartupDeliveryInput } from '../delivery-model';
import type { StartupProjectCheckpoint } from './project-model';
export function validateProjectLinks(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  const tick = saved.tick, house = saved.houseAccounting, source = saved.sourceAccounting, timeline = saved.timeline;
  requireCheckpoint([house.tick,source.tick,timeline.tick,saved.sink.through+1].every(value => value === tick));
  requireCheckpoint(sameHouseLedger(house.state,timeline.accounting.state));
  requireCheckpoint(timeline.funding.bank === timeline.accounting.state.endingEnergy);
  requireCheckpoint(timeline.accounting.state.birthEnergy === timeline.births.reduce((sum,birth) => sum+birth.cost,0));
  requireCheckpoint(saved.sink.acceptedEnergy === saved.delivery.deliveredEnergy);
  requireCheckpoint(source.state.deliveredEnergy === saved.settled.reduce((sum,receipt) => sum+receipt.energy,0));
  validateProjectHouseholdLinks(input,saved);
  validateAmbientLinks(input,saved);
  validateReceiptIdentities(input,saved);
  validateProjectSourceLinks(input,saved);
  validateOpeningLinks(input,saved);

}
function sameHouseLedger(a: StartupProjectCheckpoint['houseAccounting']['state'], b: typeof a): boolean {
  return Object.keys(a).filter(key => !['firstRecoveryAt','constructionRecoveryMargin'].includes(key)).every(key => a[key as keyof typeof a] === b[key as keyof typeof b]);
}
function validateReceiptIdentities(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  requireCheckpoint(saved.timeline.receiptCount === saved.settled.length);
  const spawning = input.project.spawning;
  const expected = new Set([...spawning.cash.flows.map(flow => flow.id),...spawning.requests.map(request => 'birth:'+request.id),...saved.settled.map(receiptId)]);
  requireCheckpoint(expected.size === saved.timeline.receiptIds.length && saved.timeline.receiptIds.every(id => expected.has(id)));
}

function validateOpeningLinks(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  const opening = saved.opening;
  const credit = Math.min(opening.constructionEnergyFromOpening,input.project.spawning.cash.selfHarvestedConstruction);
  requireCheckpoint(saved.houseAccounting.openingConstructionEnergy === credit && saved.sourceAccounting.openingConstructionEnergy === credit);
  requireCheckpoint(saved.timeline.accounting.openingConstructionEnergy === 0);
}

function validateAmbientLinks(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  if (!input.project.spawning.funding.energyLayout?.regeneration) return;
  const ambient = saved.timeline.accounting.state.ambientEnergy;
  requireCheckpoint(saved.houseAccounting.state.ambientEnergy === ambient && saved.sourceAccounting.state.ambientEnergy === ambient);
}
