import { courierCapacity } from '../../src/features/logistics/courier-demand';
import { maintainNativeCouriers } from '../../src/app/native-courier-population';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { defaults } from '../../src/config/model';
import { loop as botLoop } from '../../src/main';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { observeMiningStations } from '../../src/adapters/screeps/mining-stations';
import { createStationStore } from '../../src/features/mining/station-store';
import { miningOwner } from '../../src/features/mining/demand';
import { createNativeCourierRoutes } from '../../src/app/native-courier-routes';
import { haulingDemand } from '../../src/capabilities/logistics/demand';
const state = createMemoryPort(() => Memory);
const observeRoutes = createNativeCourierRoutes(state);
export function loop() {
  botLoop();
  const stations = observeMiningStations('W0N1', 'safe', 10)!;
  createStationStore(state, 'W0N1').observe(Game.time, stations);
  Game.creeps['miner']!.memory.population = { owner: miningOwner(stations[0]!), home: 'W0N1' };
  const observed = observeRoutes(Game.rooms['W0N1']!, ['carry', 'carry', 'move'], { ...defaults, mineralTransportEnabled: true });
  const demand = haulingDemand(observed.routes, { utilization: 0.8, workerCapacity: 100, committedCapacity: 0 });
  const memory = Memory as Memory & { courierRoutes?: unknown[]; mineralFleet?: { count: number; capacity: number; required: number }[] };
  if (stations.some(station => station.kind === 'mineral')) {
    let required = 0;
    maintainNativeCouriers(state, Game.rooms['W0N1']!, { ...defaults, mineralTransportEnabled: true, courierSpawningEnabled: true, courierBodyBudget: 150 }, (room, body, config) => {
      const routes = observeRoutes(room, body, config);
      required = haulingDemand(routes.routes, { utilization: 0.8, workerCapacity: courierCapacity(body), committedCapacity: 0 }).requiredCapacity;
      return routes;
    });
    const requests = createSpawnQueue(state, 'W0N1').list();
    (memory.mineralFleet ??= []).push({ count: requests.length, capacity: courierCapacity(requests[0]!.body), required });
  }
  (memory.courierRoutes ??= []).push({ routes: observed.routes, replacement: observed.travelTicks, required: demand.requiredCapacity });
}

