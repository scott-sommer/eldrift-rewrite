import type { RuntimeConfig } from '../config/model';
import { courierCapacity } from '../features/logistics/courier-demand';
import { courier } from '../capabilities/spawning/economy-recipes';
/** Generation uses a feasible pickup batch; admission verifies each courier's actual capacity. */
export function nativePickupCapacity(room: Room, units: readonly Creep[], config: Readonly<RuntimeConfig>): number {
  const capacities = units.map(unit => unit.store.getCapacity()).filter(capacity => capacity > 0);
  const planned = courier(Math.min(config.courierBodyBudget, room.energyAvailable));
  return capacities.length ? Math.min(...capacities) : planned ? courierCapacity(planned.parts) : 0;
}
