import type { StatePort } from '../persistence/versioned-state';
import type { Position } from '../capabilities/movement/step';
import type { createNativeDispatch } from './native-dispatch';
import type { NativeUpgradeLayout } from './native-upgrade-layout';
import { createCreepActions } from '../adapters/screeps/creep-actions';
import { issueCollection } from '../features/logistics/collect-intent';
import { logisticsPool } from '../capabilities/logistics/request';
import { upgradeOwner } from '../features/work/upgrade-identity';
/** Station ownership is independent from storage collection and controller work. */
export function runUpgradeUnit(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>, creep: Creep,
  room: string, station: Position, layout: NativeUpgradeLayout): void {
  const owner = upgradeOwner(room);
  const actions = createCreepActions(creep, owner, dispatch.arbiter);
  if (!creep.pos.isEqualTo(station.x, station.y) || creep.room.name !== room) {
    dispatch.movement.move(creep, { owner, destination: station, range: 0, group: owner,
      policy: { version: 'upgrade-stations', maximumRooms: 16, blockedRooms: [], costs: {} } });
  }
  if (creep.pos.inRangeTo(layout.controller, 3) && creep.store.energy > 0) actions.upgrade(layout.controller);
  if (!creep.pos.isNearTo(layout.storage)) return;
  const free = creep.store.getFreeCapacity();
  if (free <= 0) return;
  issueCollection(state, Game.time, { owner, holder: creep.name, source: layout.storage.id, sink: creep.id,
    resource: 'energy', stock: layout.storage.store.energy, free, maximum: free, minimum: 0,
    sinkPool: logisticsPool('capacity', creep.id) }, amount => actions.withdraw(layout.storage, RESOURCE_ENERGY, amount));
}
