import { reconcileMiningDemand } from '../features/mining/reconcile-demand';
import { configureMineralStation, miningPopulationFor } from './native-mining-policy';
import { miningRetreat } from '../adapters/screeps/mining-retreat';
import { cancelMiningDemand } from '../features/mining/cancel-demand';
import type { StatePort } from '../persistence/versioned-state';
import type { RoomFeature } from './runtime-model';
import { createMiningCycle } from './mining-cycle';
import { validMiningPayload } from './mining-task';
import type { createNativeMiner } from '../adapters/screeps/mining';
import { observeMiningStations } from '../adapters/screeps/mining-stations';
import { plannedHarvestRate } from '../adapters/screeps/mining-rates';
import { sourceMiner } from '../capabilities/spawning/economy-recipes';
interface MiningPorts { mine: ReturnType<typeof createNativeMiner>; activate(): void }
export function createNativeMiningFeature(state: StatePort, { mine, activate }: MiningPorts) {
  const feature: RoomFeature = {
    id: 'mining', urgency: 'urgent', interval: 1,
    run({ room: view, config }) {
      if (!config.values.miningEnabled) { cancelMiningDemand(state, view.name); return; }
      const room = Game.rooms[view.name];
      if (!room?.controller?.my) return;
      const retreat = Object.values(Game.spawns).find(item => item.room.name === room.name)?.pos;
      if (!retreat) return;
      activate();
      const threats = room.find(FIND_HOSTILE_CREEPS).filter(creep => !config.values.allies.includes(creep.owner.username));
      const unsafe = threats.length > 0;
      const refuge = miningRetreat(retreat, threats);
      if (unsafe) cancelMiningDemand(state, room.name);
      const observed = observeMiningStations(room.name, unsafe ? 'hostile' : 'safe')!;
      const units = miningPopulationFor(room.name, observed);
      const budget = Math.min(config.values.miningBodyBudget, units.length ? room.energyCapacityAvailable : room.energyAvailable);
      const body = sourceMiner(budget)?.parts;
      const stations = observed.map(station => configureMineralStation(station, body, config.values.mineralMiningEnabled));
      reconcileMiningDemand(state, room.name, room.name, stations);
      const cycle = createMiningCycle<Creep>(state, {
        clock: () => Game.time, unit: creep => creep.name, context: name => Game.creeps[name]!, taskLifetime: 1600,
        plan: station => body ? { station, home: room.name, body, priority: station.kind === 'energy' ? 0 : 10, travelTicks: 25, marginTicks: 10, requestLifetime: 100 } : undefined,
        productionRate: (parts, station) => plannedHarvestRate(parts, station.kind),
        run: (creep, station, tile, assigned, owner) => !unsafe && station.kind === 'mineral' && !config.values.mineralMiningEnabled
          ? { status: 'blocked', reason: 'mineral-mining-disabled', retryAt: Game.time + 1 } : unsafe && !refuge
          ? { status: 'blocked', reason: 'no-retreat-position', retryAt: Game.time + 1 } : mine(creep, { station, tile, assigned, owner, unsafe,
          retreat: refuge ?? { room: room.name, x: creep.pos.x, y: creep.pos.y },
          policy: { version: 'owned-mining', blockedRooms: [], costs: {}, maximumRooms: 4 } }),
      });
      cycle.run([{ room: room.name, stations }], units);
    },
  };
  return { feature, definitions: { mine: { phases: ['work'], validPayload: validMiningPayload } } };
}

