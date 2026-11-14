import { generateNativeLogisticsRequests } from './native-logistics-requests';
import { generateNativeLinkService } from './native-link-service';
import { runNativeLinks } from './native-links';
import { settleHaulingTask } from './settle-hauling-task';
import { observeTransfer } from '../adapters/screeps/transfer-observation';
import { recoverNativeCargo } from './native-cargo-recovery';
import { createNativeCourierRoutes } from './native-courier-routes';
import { haulingOwner } from '../features/logistics/identity';
import { maintainNativeCouriers, cancelCourierDemand } from './native-courier-population';

import type { StatePort } from '../persistence/versioned-state';
import type { RoomFeature } from './runtime-model';
import type { createNativeDispatch } from './native-dispatch';
import { createNativeHaulingTask } from './native-hauling-task';
import { selectHaulingTask } from './select-hauling-task';
import { createTaskRunner } from './task-runner';
import { observeHauling } from '../adapters/screeps/hauling-observation';
export { haulingOwner } from '../features/logistics/identity';
/** Executes explicit queued work for couriers owned by this room's logistics policy. */
export function createNativeLogisticsFeature(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>) {
  const definitions = { haul: createNativeHaulingTask(state, dispatch,
    { version: 'owned-logistics', blockedRooms: [], costs: {}, maximumRooms: 4 }) };
  const observeRoutes = createNativeCourierRoutes(state);
  const execute = createTaskRunner(state, definitions, () => Game.time);
  const feature: RoomFeature = {
    id: 'logistics', urgency: 'urgent', interval: 1,
    run({ room: view, config }) {
      if (!config.values.logisticsEnabled || !Game.rooms[view.name]?.controller?.my) { cancelCourierDemand(state, view.name); return; }
      const units = Object.values(Game.creeps).filter(creep => !creep.spawning &&
        creep.memory.population?.home === view.name && creep.memory.population.owner === haulingOwner(view.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      dispatch.activate();
      if (config.values.linksEnabled) runNativeLinks(state, Game.rooms[view.name]!, dispatch.arbiter, config.values);
      generateNativeLinkService(state, Game.rooms[view.name]!, config.values);
      for (const creep of units) {
        settleHaulingTask(state, definitions, creep, observeTransfer);
        recoverNativeCargo(state, definitions, creep, view.name, config.values.terminalFreeReserve);
        selectHaulingTask(state, definitions, { home: view.name, name: creep.name, unitId: creep.id,
          tick: Game.time, cargoTotal: creep.store.getUsedCapacity() }, request => observeHauling(creep, request));
        execute(creep.name, creep);
      }
      generateNativeLogisticsRequests(state, Game.rooms[view.name]!, units, config.values);
      maintainNativeCouriers(state, Game.rooms[view.name]!, config.values, observeRoutes);
    },
  };
  return { feature, definitions };
}





