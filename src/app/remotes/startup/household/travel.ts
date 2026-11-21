import { createMatrixSnapshots } from '../../../../adapters/screeps/matrix-snapshots';
import { movementPosition } from '../../../../adapters/screeps/movement-traffic';
import { logisticsPool } from '../../../../capabilities/logistics/request';
import { quoteHouseholdTravel } from '../../../../capabilities/economy/startup/household/travel';
import type { HouseholdTravelPlan } from '../../../../capabilities/economy/startup/household/travel';
import { createIntelStore } from '../../../../features/intel/store';
import type { StatePort } from '../../../../persistence/versioned-state';
import { prepareRemoteMatrices } from '../../assessment/matrices';
import { measureRemoteLeg } from '../../assessment/travel';
import { observeStartupEndpoint } from '../endpoint-facts';
import { startupClaimedPools } from '../stock';
/** One actual bank and energy structure; a route never grants aggregate room refill capacity. */
export function createNativeHouseholdTravel(state: StatePort, maximumOps: number) {
  if (!Number.isSafeInteger(maximumOps) || maximumOps < 1 || maximumOps > 100000) throw new Error('Invalid household path budget');
  const snapshots = createMatrixSnapshots(), intel = createIntelStore(state);
  return (plan: HouseholdTravelPlan, guard: () => boolean = () => true) => {
    if (!guard()) return deferred('admission');
    const observed = observeHouseholdPlan(state,plan);
    if (observed.status === 'deferred') return observed;
    return measure(plan,observed,guard);
  };
  function measure(plan: HouseholdTravelPlan, observed: Extract<ReturnType<typeof observeHouseholdPlan>,{ status: 'observed' }>, guard: () => boolean) {
    const context = { intel: (room: string) => intel.peek(room,Game.time).record };
    const matrices = prepareRemoteMatrices(context,[plan.home],1,snapshots);
    if (![plan.spawn.exit,plan.source.pickup,plan.destination.deposit].every(point => walkable(point,matrices))) return deferred('service-tile');
    const binding = JSON.stringify(['household-fixed-service-v1',matrices.version]);
    if (binding.length > 8192) return deferred('binding-capacity');
    const quoted = quoteHouseholdTravel(plan,binding,(leg,admitted) => measureRemoteLeg(context,leg,[plan.home],maximumOps,snapshots,admitted),guard);
    if (quoted.status !== 'complete') return quoted;
    return { ...quoted,observedAt: Game.time,source: observed.source,destination: observed.destination };
  }
}
function observeHouseholdPlan(state: StatePort, plan: HouseholdTravelPlan) {
  const home = Game.rooms[plan.home]; if (!home?.controller?.my) return deferred('home');
  const claims = startupClaimedPools(state), source = observeStartupEndpoint(plan.source.id,home,claims), destination = observeDestination(plan,claims);
  if (!source || !destination || !samePosition(source.position,plan.source.position)) return deferred('endpoint');
  const claimedEnergy = claims.get(logisticsPool('stock',source.id,'energy')) ?? 0;
  return { status: 'observed' as const,source: { ...source,claimedEnergy,availableEnergy: Math.max(0,source.energy-claimedEnergy) },destination };
}
function observeDestination(plan: HouseholdTravelPlan, claims: ReadonlyMap<string,number>) {
  const spawn = Game.getObjectById(plan.spawn.id as Id<StructureSpawn>), target = Game.getObjectById(plan.destination.id as Id<StructureSpawn | StructureExtension>);
  if (!validSpawn(spawn,plan) || !validDestination(target,plan.home)) return undefined;
  const position = movementPosition(target.pos); if (!samePosition(position,plan.destination.position)) return undefined;
  const claimedCapacity = claims.get(logisticsPool('capacity',target.id)) ?? 0;
  const freeCapacity = target.store.getFreeCapacity(RESOURCE_ENERGY);
  return { id: target.id,type: target.structureType,position,energy: target.store.energy,capacity: target.store.getCapacity(RESOURCE_ENERGY),
    freeCapacity,claimedCapacity,availableCapacity: Math.max(0,freeCapacity-claimedCapacity) };
}
function samePosition(a: HouseholdTravelPlan['spawn']['position'], b: typeof a): boolean { return a.room === b.room && a.x === b.x && a.y === b.y; }
function walkable(point: HouseholdTravelPlan['spawn']['position'], matrices: ReturnType<typeof prepareRemoteMatrices>): boolean {
  if (point.x === 0 || point.x === 49 || point.y === 0 || point.y === 49) return false;
  const matrix = matrices.matrix(point.room); return !!matrix && matrix.get(point.x,point.y) !== 255 && Game.rooms[point.room]!.getTerrain().get(point.x,point.y) !== TERRAIN_MASK_WALL;
}
function deferred(reason: string) { return { status: 'deferred' as const,reason }; }

function validSpawn(spawn: StructureSpawn | null, plan: HouseholdTravelPlan): spawn is StructureSpawn {
  return !!spawn && spawn.structureType === 'spawn' && spawn.my && spawn.isActive() && samePosition(movementPosition(spawn.pos),plan.spawn.position);
}
function validDestination(target: StructureSpawn | StructureExtension | null, home: string): target is StructureSpawn | StructureExtension {
  return !!target && target.my && target.isActive() && ['spawn','extension'].includes(target.structureType) && target.pos.roomName === home;
}
