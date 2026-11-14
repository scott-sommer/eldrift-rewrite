import { cancelMiningDemand } from '../features/mining/cancel-demand';
import type { StatePort } from '../persistence/versioned-state';
import type { RoomFeature } from './runtime-model';
import { createMiningCycle } from './mining-cycle';
import { validMiningPayload } from './mining-task';
import { createActionArbiter } from '../core/execution/action-arbiter';
import { createMovementService } from '../adapters/screeps/movement-service';
import { createNativeMiner } from '../adapters/screeps/mining';
import { observeMiningStations } from '../adapters/screeps/mining-stations';
import { observeMiningPopulation, plannedHarvestRate } from '../adapters/screeps/mining-rates';
import { createNativeSpawn } from '../adapters/screeps/spawn';
import { populationMemory, observeSpawning } from '../adapters/screeps/population';
import { createSpawnCoordinator } from '../features/population/spawn-coordinator';
import { sourceMiner } from '../capabilities/spawning/economy-recipes';
export function createNativeMiningFeature(state: StatePort) {
  const arbiter = createActionArbiter(() => Game.time);
  const movement = createMovementService(arbiter);
  const mine = createNativeMiner(arbiter, movement);
  const spawn = createSpawnCoordinator(state, { clock: () => Game.time, invoke: createNativeSpawn(populationMemory) }, observeSpawning, 'skip');
  let activeTick = -1;
  const feature: RoomFeature = {
    id: 'mining', urgency: 'urgent', interval: 1,
    run({ room: view, config }) {
      if (!config.values.miningEnabled) { cancelMiningDemand(state, view.name); return; }
      const room = Game.rooms[view.name];
      if (!room?.controller?.my) return;
      const retreat = Object.values(Game.spawns).find(item => item.room.name === room.name)?.pos;
      if (!retreat) return;
      activeTick = Game.time;
      const unsafe = room.find(FIND_HOSTILE_CREEPS).some(creep => !config.values.allies.includes(creep.owner.username));
      if (unsafe) cancelMiningDemand(state, room.name);
      const stations = observeMiningStations(room.name, unsafe ? 'hostile' : 'safe')!.filter(station => station.kind === 'energy');
      const units = observeMiningPopulation('energy').filter(unit => unit.room === room.name && unit.owner.startsWith('mining:'));
      const budget = Math.min(config.values.miningBodyBudget, units.length ? room.energyCapacityAvailable : room.energyAvailable);
      const body = sourceMiner(budget)?.parts;
      const cycle = createMiningCycle<Creep>(state, {
        clock: () => Game.time, unit: creep => creep.name, context: name => Game.creeps[name]!, taskLifetime: 1600,
        plan: station => body ? { station, home: room.name, body, priority: 0, travelTicks: 25, marginTicks: 10, requestLifetime: 100 } : undefined,
        productionRate: (parts, station) => plannedHarvestRate(parts, station.kind),
        run: (creep, station, tile, assigned, owner) => mine(creep, { station, tile, assigned, owner, unsafe,
          retreat: { room: room.name, x: retreat.x, y: Math.min(48, retreat.y + 1) },
          policy: { version: 'owned-mining', blockedRooms: [], costs: {}, maximumRooms: 4 } }),
      });
      cycle.run([{ room: room.name, stations }], units);
    },
  };
  return { feature, definitions: { mine: { phases: ['work'], validPayload: validMiningPayload } },
    flush() { if (activeTick === Game.time) { spawn(); movement.flush(); } } };
}

