import { observeEnergySupply } from '../adapters/screeps/energy-supply';
import { generateEnergyRequests } from '../features/logistics/energy-requests';
import type { StatePort } from '../persistence/versioned-state';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import { createNativeHaulingTask } from './native-hauling-task';
import { selectHaulingTask } from './select-hauling-task';
import { createTaskRunner } from './task-runner';
import { observeHauling } from '../adapters/screeps/hauling-observation';
export function haulingOwner(room: string): string { return `logistics:${JSON.stringify(room)}`; }
/** Executes explicit queued work for couriers owned by this room's logistics policy. */
export function createNativeLogisticsFeature(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>) {
  const definitions = { haul: createNativeHaulingTask(state, dispatch,
    { version: 'owned-logistics', blockedRooms: [], costs: {}, maximumRooms: 4 }) };
  const execute = createTaskRunner(state, definitions, () => Game.time);
  const feature: RoomFeature = {
    id: 'logistics', urgency: 'urgent', interval: 1,
    run({ room: view, config }) {
      if (!config.values.logisticsEnabled || !Game.rooms[view.name]?.controller?.my) return;
      const units = Object.values(Game.creeps).filter(creep => !creep.spawning &&
        creep.memory.population?.home === view.name && creep.memory.population.owner === haulingOwner(view.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      dispatch.activate();
      for (const creep of units) {
        selectHaulingTask(state, definitions, { home: view.name, name: creep.name, unitId: creep.id,
          tick: Game.time, cargoTotal: creep.store.getUsedCapacity() }, request => observeHauling(creep, request));
        execute(creep.name, creep);
      }
      if (config.values.energyRequestsEnabled) {
        const supply = observeEnergySupply(Game.rooms[view.name]!);
        generateEnergyRequests(state, view.name, Game.time, supply.sources, supply.sinks,
          { owner: haulingOwner(view.name), lifetime: 100, maximumQuantity: 200, maximumNewRequests: 10 });
      }
    },
  };
  return { feature, definitions };
}

