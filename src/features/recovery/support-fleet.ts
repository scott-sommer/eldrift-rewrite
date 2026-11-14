import type { StatePort } from '../../persistence/versioned-state';
import type { BodyPart } from '../../capabilities/spawning/body';
import { stateKey } from '../../persistence/state-key';
import { createSpawnQueue } from '../population/spawn-queue';
import { applyCourierDemand } from '../logistics/courier-demand';
import type { CourierUnit } from '../logistics/courier-demand';
import { supportOwner } from './support-identity';
export interface SupportFleet {
  home: string; target: string; enabled: boolean; requestedCapacity: number;
  body: readonly BodyPart[] | undefined; travelTicks: number; requestLifetime: number;
}
/** Actual live carry capacity and each queued body count, rather than multiplying a new profile by unit count. */
export function maintainSupportFleet(state: StatePort, fleet: SupportFleet, units: readonly CourierUnit[], tick: number): void {
  const owner = supportOwner(fleet.home, fleet.target);
  if (!Number.isSafeInteger(fleet.requestedCapacity) || fleet.requestedCapacity < 0) throw new Error('Invalid support capacity');
  if (!fleet.enabled || !fleet.body || fleet.requestedCapacity === 0) {
    if (state.read(stateKey('spawning', fleet.home)) === undefined) return;
    const queue = createSpawnQueue(state, fleet.home);
    for (const request of queue.list().filter(item => item.owner === owner)) queue.cancel(request.id, owner);
    return;
  }
  applyCourierDemand(state, { owner, room: fleet.home, body: fleet.body, routes: [], utilization: 1,
    minimumCapacity: fleet.requestedCapacity, travelTicks: fleet.travelTicks, marginTicks: 10,
    priority: 2, requestLifetime: fleet.requestLifetime }, units, tick);
}
