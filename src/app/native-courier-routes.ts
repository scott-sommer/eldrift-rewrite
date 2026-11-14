import { observeCourierEndpoints } from './native-courier-endpoints';
import { defaults } from '../config/model';
import type { RuntimeConfig } from '../config/model';
import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import type { BodyPart } from '../capabilities/spawning/body';
import { createStationStore } from '../features/mining/station-store';
import { createLogisticsRequests } from '../features/logistics/request-store';
import { estimateCourierRoutes } from '../features/logistics/courier-routes';
import { courierCapacity } from '../features/logistics/courier-demand';
import { createTravelEstimator } from '../adapters/screeps/travel-estimate';
import { movementPosition } from '../adapters/screeps/movement-traffic';
export function createNativeCourierRoutes(state: StatePort) {
  const travel = createTravelEstimator();
  return (room: Room, body: readonly BodyPart[], config: Readonly<RuntimeConfig> = defaults) => {
    const spawns = Object.values(Game.spawns).filter(spawn => spawn.room.name === room.name).sort((a, b) => a.name.localeCompare(b.name));
    const stations = state.read(stateKey('mining-stations', room.name)) === undefined ? [] : createStationStore(state, room.name).read(Game.time).stations;
    const pending = createLogisticsRequests(state, room.name).pending(Game.time);
    const endpoints = observeCourierEndpoints(room, stations, pending, spawns, config);
    return estimateCourierRoutes(endpoints, {
      travel: (from, to, loaded) => travel(from, to, body, loaded ? courierCapacity(body) : 0),
      replacement: to => {
        const times = spawns.map(spawn => travel(movementPosition(spawn.pos), to, body, 0)?.ticks).filter(value => value !== undefined);
        return times.length ? Math.max(...times) : undefined;
      },
    }, 2, 2);
  };
}
