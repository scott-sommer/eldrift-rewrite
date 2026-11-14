import type { StatePort } from '../persistence/versioned-state';
import { stateKey } from '../persistence/state-key';
import type { BodyPart } from '../capabilities/spawning/body';
import { createStationStore } from '../features/mining/station-store';
import { miningOwner } from '../features/mining/demand';
import { createLogisticsRequests } from '../features/logistics/request-store';
import { estimateCourierRoutes } from '../features/logistics/courier-routes';
import { courierCapacity } from '../features/logistics/courier-demand';
import { createTravelEstimator } from '../adapters/screeps/travel-estimate';
import { nativeHarvestRate } from '../adapters/screeps/mining-rates';
import { movementPosition } from '../adapters/screeps/movement-traffic';
export function createNativeCourierRoutes(state: StatePort) {
  const travel = createTravelEstimator();
  return (room: Room, body: readonly BodyPart[]) => {
    const spawns = Object.values(Game.spawns).filter(spawn => spawn.room.name === room.name).sort((a, b) => a.name.localeCompare(b.name));
    const stations = state.read(stateKey('mining-stations', room.name)) === undefined ? [] : createStationStore(state, room.name).read(Game.time).stations;
    const pending = createLogisticsRequests(state, room.name).pending(Game.time);
    const endpoints = stations.filter(station => station.kind === 'energy' && station.risk === 'safe' && station.container && !station.link)
      .flatMap(station => {
        const source = Game.getObjectById(station.container as Id<StructureContainer>);
        const request = pending.find(item => item.source === station.container && item.resource === 'energy');
        const sink = request ? Game.getObjectById(request.sink as Id<Structure>) : spawns[0];
        const production = Math.min(station.throughput, Object.values(Game.creeps)
          .filter(creep => !creep.spawning && creep.memory.population?.owner === miningOwner(station))
          .reduce((sum, creep) => sum + nativeHarvestRate(creep.body, 'energy'), 0));
        return source && sink && production > 0 ? [{ station, production, source: movementPosition(source.pos), sink: movementPosition(sink.pos) }] : [];
      });
    return estimateCourierRoutes(endpoints, {
      travel: (from, to, loaded) => travel(from, to, body, loaded ? courierCapacity(body) : 0),
      replacement: to => {
        const times = spawns.map(spawn => travel(movementPosition(spawn.pos), to, body, 0)?.ticks).filter(value => value !== undefined);
        return times.length ? Math.max(...times) : undefined;
      },
    }, 2, 2);
  };
}
