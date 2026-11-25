import { validateProjectHouseholdLinks } from './household-links';
import { startupOpeningEnergy, startupProjectWaves } from '../initial';
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
  validateEnergy(input,saved);
  validateOpeningLinks(input,saved);
  const complete = saved.construction.completeAt;
  const previous = complete === null || tick <= complete ? null : tick-1;
  requireCheckpoint(saved.container.previousFrame === previous);
  if (saved.container.hits === 0) requireCheckpoint(saved.delivery.containerEnergy === 0);
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

function validateEnergy(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  const c = saved.construction, d = saved.delivery, maintenance = saved.container;
  const harvested = c.harvestedEnergy+d.harvestedEnergy;
  const held = saved.opening.pendingMinerEnergy+d.containerEnergy+d.minerCargoEnergy+saved.couriers.reduce((sum,worker) => sum+worker.cargo,0);
  const lost = d.unusedMinerCargoEnergy+d.uncapturedOverflowEnergy+d.unreturnedCourierEnergy+maintenance.unrecoveredEnergy;
  requireCheckpoint(startupOpeningEnergy(input)+harvested === c.constructionEnergy+d.deliveredEnergy+held+lost+maintenance.repairEnergy);
  requireCheckpoint(input.project.source.energy+c.regeneratedEnergy+d.regeneratedEnergy-harvested === d.source.energy);
  requireCheckpoint(input.project.remainingProgress-c.constructionEnergy === c.remainingProgress);
  requireCheckpoint(maintenance.hits === Math.max(0,input.container.hits+maintenance.repairedHits-maintenance.decayEvents*input.container.decayAmount));
}

function validateOpeningLinks(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  const initial = input.initial?.miner, opening = saved.opening;
  const wave = startupProjectWaves(input,saved.timeline.births).find(wave => wave.request === initial?.id);
  requireCheckpoint(opening.minerStarted === (!!wave && saved.tick > wave.startAt));
  requireCheckpoint(opening.minerOpeningEnergy <= saved.delivery.minerCargoEnergy);
  requireCheckpoint(opening.constructionEnergyFromOpening <= saved.construction.constructionEnergy);
  const credit = Math.min(opening.constructionEnergyFromOpening,input.project.spawning.cash.selfHarvestedConstruction);
  requireCheckpoint(saved.houseAccounting.openingConstructionEnergy === credit && saved.sourceAccounting.openingConstructionEnergy === credit);
  requireCheckpoint(saved.timeline.accounting.openingConstructionEnergy === 0);
}

function validateAmbientLinks(input: StartupDeliveryInput, saved: StartupProjectCheckpoint): void {
  if (!input.project.spawning.funding.energyLayout?.regeneration) return;
  const ambient = saved.timeline.accounting.state.ambientEnergy;
  requireCheckpoint(saved.houseAccounting.state.ambientEnergy === ambient && saved.sourceAccounting.state.ambientEnergy === ambient);
}
