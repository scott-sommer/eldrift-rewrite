import { nativeWorkerHold } from './native-worker-hold';
import { assignedMinerCollection } from './native-worker-miner';
import { selectBootstrapEnergy } from '../features/work/bootstrap-energy';
import { harvestBootstrapEnergy } from './native-bootstrap-harvest';
import { upgradeBootstrapOwner } from '../features/work/upgrade-identity';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import type { createNativeDispatch } from './native-dispatch';
import { observeWorkerEnergy } from '../adapters/screeps/worker-energy';
import { observeLinks } from '../adapters/screeps/links';
import { classifyLinks } from '../features/logistics/links/roles';
import { movementPosition } from '../adapters/screeps/movement-traffic';
import { createNativeCollection } from '../adapters/screeps/collection-execution';
import { selectProfileEnergy } from '../features/work/energy-profiles';
import { createQuantityReservations } from '../persistence/quantities/store';
import { logisticsPool } from '../capabilities/logistics/request';
import { issueCollection } from '../features/logistics/collect-intent';
import type { Outcome } from '../core/execution/model';
export function createNativeWorkerCollection(state: StatePort, dispatch: ReturnType<typeof createNativeDispatch>) {
  const collect = createNativeCollection(dispatch.arbiter, dispatch.movement);
  return (creep: Creep, home: string, owner: string, config: Readonly<RuntimeConfig>): Outcome => {
    const room = Game.rooms[home];
    if (!room) return { status: 'blocked', reason: 'home-unseen', retryAt: Game.time + 1 };
    const bootstrap = creep.memory.population?.owner === upgradeBootstrapOwner(home);
    const observed = observeLinks(room);
    const links = new Set(classifyLinks(observed.links, observed.room).controllers.map(link => link.id));
    const allocations = createQuantityReservations(state).list(Game.time).flatMap(claim => claim.allocations);
    const booked = (pool: string) => allocations.filter(item => item.pool === pool).reduce((sum, item) => sum + item.amount, 0);
    const sources = observeWorkerEnergy(room, links, bootstrap).map(source => ({ ...source,
      available: Math.max(0, source.stock - booked(logisticsPool('stock', source.id, 'energy'))) }));
    const free = creep.store.getFreeCapacity();
    const origin = creep.pos.roomName === home ? movementPosition(creep.pos) : { room: home, x: 25, y: 25 };
    let order = bootstrap ? selectBootstrapEnergy(sources, origin, free, creep.store.getCapacity()) : selectProfileEnergy(sources, origin, free, { profile: config.workerEnergyProfile, capacity: creep.store.getCapacity(),
      storageReserve: config.workerEnergyStorageReserve, holdStoragePosition: nativeWorkerHold(creep.room, config) });
    const selected = assignedMinerCollection(creep, owner, config, dispatch, booked, order);
    if (selected && 'status' in selected) return selected;
    order = selected;
    if (!order && bootstrap) return harvestBootstrapEnergy(creep, room, owner, dispatch, config.upgradeBootstrapDismantleEnabled);
    if (!order) return creep.store.energy > 0 ? { status: 'done' } : { status: 'blocked', reason: 'worker-energy-unavailable', retryAt: Game.time + 1 };
    return collect(creep, order, owner, invoke => issueCollection(state, Game.time, { owner, holder: creep.name,
      sink: creep.id, source: order.source.id, resource: 'energy', stock: Math.max(0, order.source.stock - order.reserve),
      free, maximum: order.amount, minimum: order.source.kind === 'drop' ? Math.min(order.source.stock, free) : 0,
      sinkPool: logisticsPool('capacity', creep.id) }, invoke));
  };
}
