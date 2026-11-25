import { explicitSpawnEnergyPolicy, nativeSpawnEnergyStructures, orderedSpawnEnergy } from '../../../adapters/screeps/spawn-energy';
import { logisticsPool } from '../../../capabilities/logistics/request';
import { validateEnergyLayout } from '../../../capabilities/economy/startup/energy/validation';
import type { StartupEnergyLayout } from '../../../capabilities/economy/startup/energy/model';
import type { StatePort } from '../../../persistence/versioned-state';
import { startupClaimedPools } from './stock';
/** Read-only current facts for an explicitly ordered execution policy, not the legacy SDK default. */
export function observeNativeStartupEnergy(state: StatePort, homeName: string, origins: readonly string[]) {
  const home = Game.rooms[homeName];
  if (!home?.controller?.my) return deferred('home');
  if (!origins.length || origins.length > 16 || new Set(origins).size !== origins.length) return deferred('origins');
  const points = nativeSpawnEnergyStructures(home), claims = startupClaimedPools(state);
  if (!points.length || points.length > 128) return deferred('capacity');
  const spawns = points.filter((point): point is StructureSpawn => point.structureType === 'spawn');
  const selected = origins.map(id => spawns.find(spawn => spawn.id === id));
  if (selected.some(spawn => !spawn)) return deferred('origin');
  const layout: StartupEnergyLayout = { structures: points.map(point => ({ id: point.id,kind: point.structureType,energy: point.store.energy,
    capacity: point.store.getCapacity(RESOURCE_ENERGY),reservedEnergy: claims.get(logisticsPool('stock',point.id,'energy')) ?? 0,
    reservedCapacity: claims.get(logisticsPool('capacity',point.id)) ?? 0 })),
    orders: selected.map(spawn => ({ spawn: spawn!.id,structures: orderedSpawnEnergy(spawn!,points).map(point => point.id) })) };
  if (layout.structures.some(point => point.reservedEnergy! > point.energy || point.reservedCapacity! > point.capacity-point.energy)) return deferred('liabilities');
  validateEnergyLayout(layout);
  return { status: 'observed' as const,observedAt: Game.time,policy: explicitSpawnEnergyPolicy,layout,
    initialEnergy: layout.structures.reduce((sum,point) => sum+point.energy-point.reservedEnergy!,0),
    capacity: layout.structures.reduce((sum,point) => sum+point.capacity-point.reservedEnergy!-point.reservedCapacity!,0) };
}
function deferred(reason: string) { return { status: 'deferred' as const,reason }; }
