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
  const stations = observeMiningStations('W0N1', 'safe')!;
  createStationStore(state, 'W0N1').observe(Game.time, stations);
  Game.creeps['miner']!.memory.population = { owner: miningOwner(stations[0]!), home: 'W0N1' };
  const observed = observeRoutes(Game.rooms['W0N1']!, ['carry', 'carry', 'move']);
  const demand = haulingDemand(observed.routes, { utilization: 0.8, workerCapacity: 100, committedCapacity: 0 });
  const memory = Memory as Memory & { courierRoutes?: unknown[] };
  (memory.courierRoutes ??= []).push({ routes: observed.routes, replacement: observed.travelTicks, required: demand.requiredCapacity });
}

