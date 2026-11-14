import { nativePickupCapacity } from './native-pickup-capacity';
import type { StatePort } from '../persistence/versioned-state';
import type { RuntimeConfig } from '../config/model';
import { observeEnergySupply } from '../adapters/screeps/energy-supply';
import { observeWorkSupply } from '../adapters/screeps/work-supply';
import { workOwner } from '../features/work/identity';
import { workSupplySinks } from '../features/logistics/work-supply';
import { generateStockRequests } from '../features/logistics/stock-requests';
import { haulingOwner } from '../features/logistics/identity';
/** Workers advertise ownership; hauling does not infer work from body parts or legacy role names. */
export function generateNativeWorkSupply(state: StatePort, room: Room, units: readonly Creep[], config: Readonly<RuntimeConfig>): void {
  const policy = { owner: haulingOwner(room.name) + ':work', namespace: 'work-supply', priority: 4,
    lifetime: 100, maximumQuantity: config.workerSupplyEnabled ? Math.max(200, nativePickupCapacity(room, units, config)) : 200, maximumNewRequests: 10 };
  if (!config.workerSupplyEnabled) { generateStockRequests(state, room.name, Game.time, [], [], policy); return; }
  const workers = Object.values(Game.creeps).filter(unit => unit.memory.population?.home === room.name &&
    unit.memory.population.owner === workOwner(room.name));
  const observed = observeWorkSupply(room, workers);
  const supply = observeEnergySupply(room, nativePickupCapacity(room, units, config), config.towerRefillFraction);
  const sinks = workSupplySinks(observed, supply.sinks.some(item => item.amount > 0), config.controllerContainerTarget);
  const sources = supply.sources.filter(item => item.id !== observed.container?.id)
    .map(item => ({ id: item.id, resource: 'energy', amount: item.amount, minimumBatch: item.minimumBatch ?? 0, priority: item.priority }));
  generateStockRequests(state, room.name, Game.time, sources, sinks, policy);
}
