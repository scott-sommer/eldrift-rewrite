import { startupOpeningEnergy,startupProjectWaves } from '../initial';
import { requireCheckpoint } from './validation';
import type { StartupDeliveryInput } from '../delivery-model';
import type { StartupProjectCheckpoint } from './project-model';
type SourceLinks = Pick<StartupProjectCheckpoint,'construction' | 'delivery' | 'container' | 'opening' | 'couriers' | 'tick'> & { timeline: Pick<StartupProjectCheckpoint['timeline'],'births'> };
export function validateProjectSourceLinks(input: StartupDeliveryInput,saved: SourceLinks): void {
  validateEnergy(input,saved);
  const initial = input.initial?.miner,opening = saved.opening;
  const wave = startupProjectWaves(input,saved.timeline.births).find(wave => wave.request === initial?.id);
  requireCheckpoint(opening.minerStarted === (!!wave && saved.tick > wave.startAt));
  requireCheckpoint(opening.minerOpeningEnergy <= saved.delivery.minerCargoEnergy);
  requireCheckpoint(opening.constructionEnergyFromOpening <= saved.construction.constructionEnergy);
  const complete = saved.construction.completeAt;
  const previous = complete === null || saved.tick <= complete ? null : saved.tick-1;
  requireCheckpoint(saved.container.previousFrame === previous);
  if (saved.container.hits === 0) requireCheckpoint(saved.delivery.containerEnergy === 0);
}
function validateEnergy(input: StartupDeliveryInput, saved: SourceLinks): void {
  const c = saved.construction, d = saved.delivery, maintenance = saved.container;
  const harvested = c.harvestedEnergy+d.harvestedEnergy;
  const held = saved.opening.pendingMinerEnergy+d.containerEnergy+d.minerCargoEnergy+saved.couriers.reduce((sum,worker) => sum+worker.cargo,0);
  const lost = d.unusedMinerCargoEnergy+d.uncapturedOverflowEnergy+d.unreturnedCourierEnergy+maintenance.unrecoveredEnergy;
  requireCheckpoint(startupOpeningEnergy(input)+harvested === c.constructionEnergy+d.deliveredEnergy+held+lost+maintenance.repairEnergy);
  requireCheckpoint(input.project.source.energy+c.regeneratedEnergy+d.regeneratedEnergy-harvested === d.source.energy);
  requireCheckpoint(input.project.remainingProgress-c.constructionEnergy === c.remainingProgress);
  requireCheckpoint(maintenance.hits === Math.max(0,input.container.hits+maintenance.repairedHits-maintenance.decayEvents*input.container.decayAmount));
}

