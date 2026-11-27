import { copyPlain } from '../../../../../core/plain-data';
import type { StartupPaidWorker } from '../../../../../capabilities/economy/startup/shared-model';
import type { RemoteTransportDemand } from '../../../../../features/remotes/transport-authority';
import type { PaidHaulingForecastSeed,PaidHaulingForecastWorker } from '../service';
import type { PaidTransportBinding,PaidTransportSource } from './model';
export function paidTransportBindings(home: string,sources: readonly PaidTransportSource[],seed: PaidHaulingForecastSeed) {
  const bindings = new Map<string,PaidTransportBinding>();
  for (const source of copyPlain([...sources])) {
    if (!sourceMatches(home,source,seed.tick)) throw new Error('Paid transport source mismatch');
    for (const { paid } of source.couriers) {
      const worker = seed.workers.find(worker => worker.name === paid.request);
      if (!worker || bindings.has(paid.request) || !workerMatches(worker,source,paid)) throw new Error('Paid transport worker mismatch');
      bindings.set(paid.request,{ source,paid });
    }
  }
  if (home !== seed.home || bindings.size !== seed.workers.length) throw new Error('Incomplete paid transport bindings');
  return bindings;
}
function sourceMatches(home: string,source: PaidTransportSource,tick: number): boolean {
  return source.demand.home === home && source.plan.home === home && source.demand.room === source.plan.room && source.demand.source === source.plan.source
    && Number.isSafeInteger(source.demand.expiresAt) && source.demand.expiresAt > tick && Number.isSafeInteger(source.demand.generation) && source.demand.generation > 0;
}
function workerMatches(worker: PaidHaulingForecastWorker,source: PaidTransportSource,paid: StartupPaidWorker): boolean {
  return worker.source === source.demand.source && worker.opening.observed.owner === paid.owner
    && (['activeAt','retireAt','expiresAt'] as const).every(key => worker.opening.observed[key] === paid[key]);
}
export function sameTransportAuthority(expected: RemoteTransportDemand,current: RemoteTransportDemand,tick: number): boolean {
  return current.kind === 'mine' && Number.isSafeInteger(current.expiresAt) && current.expiresAt > tick && ['id','assignment','generation','home','room','source'].every(key => expected[key as keyof RemoteTransportDemand] === current[key as keyof RemoteTransportDemand]);
}
