import { startupDeliveryCash } from './delivery-cash';
import { forecastStartupConstruction } from './construction';
import { startupConstructionWaves } from './construction-workers';
import { startupDeliveryCouriers, advanceStartupCouriers } from './delivery-couriers';
import { startupMiningFrame } from './delivery-mining';
import { advanceStartupSource } from './source';
import type { StartupDeliveryForecast, StartupDeliveryInput } from './delivery-model';
/** Construction and scheduled births establish labor; finite source stock and trips establish receipts. */
export function forecastStartupDelivery(input: StartupDeliveryInput) {
  if (!Number.isSafeInteger(input.containerCapacity) || input.containerCapacity < 1 || input.containerCapacity > 1000000) throw new Error('Invalid startup container capacity');
  const project = forecastStartupConstruction(input.project), construction = project.construction;
  const waves = startupConstructionWaves(input.project,project.spawning.births), couriers = startupDeliveryCouriers(input,project.spawning.births);
  const delivery: StartupDeliveryForecast = { firstDeliveryAt: null,deliveredEnergy: 0,harvestedEnergy: 0,regeneratedEnergy: 0,
    containerEnergy: 0,minerCargoEnergy: 0,courierCargoEnergy: 0,unusedMinerCargoEnergy: construction.unusedCargoEnergy,projectedThrough: construction.projectedThrough,source: { ...construction.source },receipts: [] };
  if (construction.completeAt === null) return { ...project,delivery,cash: startupDeliveryCash(input,project.spawning,construction,delivery) };
  const lastBuilder = construction.waves.at(-1);
  let previous = lastBuilder?.request;
  delivery.minerCargoEnergy = lastBuilder ? lastBuilder.work.carriedEnergy : 0;
  delivery.unusedMinerCargoEnergy -= delivery.minerCargoEnergy;
  const horizon = input.project.spawning.cash.horizon;
  for (let tick = construction.completeAt; tick <= horizon; tick++) {
    const wave = waves.find(wave => wave.startAt <= tick && tick < wave.endAt);
    previous = switchMiner(delivery,previous,wave?.request);
    const deposit = startupMiningFrame(delivery,wave,tick,input.containerCapacity);
    advanceStartupCouriers(couriers,delivery,tick,horizon);
    delivery.containerEnergy += deposit;
    delivery.regeneratedEnergy += advanceStartupSource(delivery.source,1);
  }
  delivery.projectedThrough = horizon+1;
  delivery.receipts.sort((a,b) => a.tick-b.tick || a.request.localeCompare(b.request));
  delivery.courierCargoEnergy = couriers.reduce((sum,worker) => sum+worker.cargo,0);
  return { ...project,delivery,cash: startupDeliveryCash(input,project.spawning,construction,delivery) };
}

function switchMiner(result: StartupDeliveryForecast, previous: string | undefined, next: string | undefined): string | undefined {
  if (previous !== next) { result.unusedMinerCargoEnergy += result.minerCargoEnergy; result.minerCargoEnergy = 0; }
  return next;
}
