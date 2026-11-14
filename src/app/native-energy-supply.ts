import { observeRecoverableResources } from '../adapters/screeps/recoverable-resources';
import { preserveResources } from '../features/logistics/preserve-resources';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { observeEnergySupply } from '../adapters/screeps/energy-supply';
import { generateEnergyRequests } from '../features/logistics/energy-requests';
import { haulingOwner } from '../features/logistics/identity';
import { courierCapacity } from '../features/logistics/courier-demand';
import { courier } from '../capabilities/spawning/economy-recipes';
/** Generation uses a feasible pickup batch; admission still verifies each courier's actual capacity. */
export function generateNativeEnergyRequests(state: StatePort, room: Room, units: readonly Creep[], config: Readonly<RuntimeConfig>): void {
  const capacities = units.map(unit => unit.store.getCapacity()).filter(capacity => capacity > 0);
  const planned = courier(Math.min(config.courierBodyBudget, room.energyAvailable));
  const pickupCapacity = capacities.length ? Math.min(...capacities) : planned ? courierCapacity(planned.parts) : 0;
  if (config.energyRequestsEnabled) {
    const supply = observeEnergySupply(room, pickupCapacity);
    generateEnergyRequests(state, room.name, Game.time, supply.sources, supply.sinks,
      { owner: haulingOwner(room.name), lifetime: 100, maximumQuantity: Math.max(200, pickupCapacity), maximumNewRequests: 10 });
  }
  if (config.preservationEnabled) {
    const recoverable = observeRecoverableResources(room, pickupCapacity);
    preserveResources(state, room.name, Game.time, recoverable.sources, recoverable.sinks,
      { owner: haulingOwner(room.name) + ':preserve', lifetime: 100, maximumQuantity: Math.max(200, pickupCapacity), maximumNewRequests: 10 });
  }
}
