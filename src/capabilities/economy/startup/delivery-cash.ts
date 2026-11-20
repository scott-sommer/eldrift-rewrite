import { forecastStartupCash } from './cash';
import type { StartupConstructionForecast } from './construction-model';
import type { StartupSpawnForecast } from './spawn-model';
import type { StartupDeliveryForecast, StartupDeliveryInput } from './delivery-model';
export function startupDeliveryCash(input: StartupDeliveryInput, spawning: StartupSpawnForecast, construction: StartupConstructionForecast, delivery: StartupDeliveryForecast) {
  const initial = input.project.spawning.cash;
  const readyAt = Math.min(10000,Math.max(initial.readyAt,construction.completeAt ?? 10000));
  const receipts = delivery.receipts.map(receipt => ({ ...receipt,id: 'remote-delivery:'+receipt.request+':'+receipt.tick }));
  const cash = forecastStartupCash({ ...initial,readyAt,flows: spawning.flows },receipts);
  if (construction.completeAt === null || construction.completeAt > initial.horizon) cash.firstRecoveryAt = null;
  return cash;
}

/** Outside income can finance a body, but cannot establish this source project's return. */
export function startupSourceCash(input: StartupDeliveryInput, spawning: StartupSpawnForecast, construction: StartupConstructionForecast, delivery: StartupDeliveryForecast) {
  return startupDeliveryCash(input,{ ...spawning,flows: spawning.flows.filter(flow => flow.kind !== 'delivery') },construction,delivery);
}
