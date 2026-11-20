import { snapshotStartupProject } from '../snapshot';
import { StartupCheckpointCapacityError } from './capacity';
import { copyPlain } from '../../../../core/plain-data';
import type { StartupDeliveryInput } from '../delivery-model';
import { record } from './validation';
/** Exact input binding; object property order and live-name Set insertion order are immaterial. */
export function startupProjectIdentity(input: StartupDeliveryInput): string {
  input = snapshotStartupProject(input);
  const spawning = input.project.spawning;
  const couriers = input.couriers.map(worker => ({ ...worker,collectionTicks: worker.collectionTicks ?? 1,deliveryTicks: worker.deliveryTicks ?? 1,initialOutboundTicks: worker.initialOutboundTicks ?? worker.outboundTicks }));
  const requests = spawning.requests.map(request => ({ ...request,home: request.home ?? null,placement: request.placement ?? null }));
  const wire = copyPlain({ ...input,couriers,project: { ...input.project,spawning: { ...spawning,requests,liveNames: [...spawning.liveNames].sort() } } });
  const identity = JSON.stringify(wire,(_key,value: unknown) => record(value) ? ordered(value) : value);
  if (identity.length > 262144) throw new StartupCheckpointCapacityError('Startup checkpoint input capacity');
  return identity;
}
function ordered(value: Record<string,unknown>): Record<string,unknown> {
  return Object.fromEntries(Object.keys(value).sort().map(key => [key,value[key]]));
}
