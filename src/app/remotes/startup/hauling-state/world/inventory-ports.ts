import { withinRange } from '../../../../../capabilities/movement/path-model';
import type { EnergyInventoryFrame } from '../../../../../capabilities/resources/energy-inventory/frame';
import type { HomeWorldBodies } from './bodies';
import type { HomeWorldShared } from './model';
/** External actor intents bind to the actual current body pose; selection/power remain actor policy inputs. */
export function homeWorldInventoryPorts(inventory: EnergyInventoryFrame,bodies: HomeWorldBodies): HomeWorldShared['inventory'] {
  return { tick: inventory.tick,observe: inventory.observe,source: inventory.source,structure: inventory.structure,site: inventory.site,pending: inventory.pending,effect: inventory.effect,
    queue(intent) {
      if (intent.kind === 'harvest' || intent.kind === 'repair' || intent.kind === 'build') {
        const body = bodies.get(intent.kind === 'harvest' ? intent.target : intent.source);
        if (body.spawning || !withinRange(body.position,intent.position,0)) throw new Error('Home '+intent.kind+' body pose mismatch');
      }
      inventory.queue(intent);
    },
  };
}
