import { loop as botLoop } from '../../src/main';
import { createMiningCycle } from '../../src/app/mining-cycle';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createActionArbiter } from '../../src/core/execution/action-arbiter';
import { createMovementService } from '../../src/adapters/screeps/movement-service';
import { createNativeMiner } from '../../src/adapters/screeps/mining';
import { observeMiningStations } from '../../src/adapters/screeps/mining-stations';
import { observeMiningPopulation, plannedHarvestRate } from '../../src/adapters/screeps/mining-rates';
import { createSpawnCoordinator } from '../../src/features/population/spawn-coordinator';
import { createSpawnQueue } from '../../src/features/population/spawn-queue';
import { createNativeSpawn } from '../../src/adapters/screeps/spawn';
import { populationMemory, observeSpawning } from '../../src/adapters/screeps/population';
export function loop() {
  botLoop();
  const memory = Memory as Memory & { colonyMining?: { accepted: number; delivered: number; workers: number; queued: number } };
  const evidence = memory.colonyMining ??= { accepted: 0, delivered: 0, workers: 0, queued: 0 };
  const state = createMemoryPort(() => Memory);
  const arbiter = createActionArbiter(() => Game.time);
  const movement = createMovementService(arbiter);
  const mine = createNativeMiner(arbiter, movement);
  const stations = observeMiningStations('W0N1', 'safe')!.filter(station => station.position.x === 18 && station.position.y === 15);
  const cycle = createMiningCycle<Creep>(state, {
    clock: () => Game.time, unit: creep => creep.name, context: name => Game.creeps[name]!, taskLifetime: 1500,
    plan: station => ({ station, home: 'W0N1', body: ['work', 'carry', 'move'], priority: 0,
      travelTicks: 3, marginTicks: 2, requestLifetime: 100 }),
    productionRate: (body, station) => plannedHarvestRate(body, station.kind),
    run: (creep, station, tile, assigned, owner) => mine(creep, { station, tile, assigned, owner,
      unsafe: station.risk === 'hostile', retreat: { room: 'W0N1', x: 15, y: 16 },
      policy: { version: 'colony-test', blockedRooms: [], costs: {}, maximumRooms: 4 } }),
  });
  cycle.run([{ room: 'W0N1', stations }], observeMiningPopulation('energy'));
  const spawn = createSpawnCoordinator(state, { clock: () => Game.time, invoke: createNativeSpawn(populationMemory) }, observeSpawning, 'skip');
  evidence.accepted += spawn().filter(receipt => receipt.status === 'accepted').length;
  movement.flush();
  evidence.delivered = Game.getObjectById(stations[0]!.container as Id<StructureContainer>)!.store.energy;
  evidence.workers = Object.keys(Game.creeps).length;
  evidence.queued = createSpawnQueue(state, 'W0N1').list().length;
}
