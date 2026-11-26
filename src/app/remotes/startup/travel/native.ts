import { copyPlain } from '../../../../persistence/plain-data';
import { createMatrixSnapshots } from '../../../../adapters/screeps/matrix-snapshots';
import { prepareRemoteMatrices } from '../../assessment/matrices';
import { measureRemoteLeg } from '../../assessment/travel';
import { createStartupTravel } from '../../../../features/remotes/startup/travel';
import { createStartupTravelContext } from './context';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { StartupStructures } from '../model';
import type { NativeStartupTravelRequest, StartupTravelOptions } from './model';
/** Exact, fixed-tile static strategy; persists completed legs, never reserves capital or grants execution authority. */
export function createNativeStartupTravel(state: StatePort, structures: StartupStructures, inputOptions: StartupTravelOptions) {
  const options = { ...inputOptions }; validateOptions(options);
  const snapshots = createMatrixSnapshots(), observe = createStartupTravelContext(state,structures,options);
  return (input: NativeStartupTravelRequest, maximumLegs = 5, guard: () => boolean = () => true) => {
    validateRequest(input,maximumLegs); const request = copyPlain(input), context = observe(request,guard);
    if (context.status !== 'ready') return { ...context,completedLegs: 0 };
    const matrices = prepareRemoteMatrices(context,context.rooms,1,snapshots);
    const points = [context.plan.spawn.exit,context.plan.station,context.plan.collection,context.plan.endpoint.deposit];
    if (!points.every(point => walkable(point,matrices)) || !guard()) return { status: 'deferred' as const,reason: 'service-tile',completedLegs: 0 };
    const binding = JSON.stringify(['startup-fixed-service-v2',matrices.version,context.route,request.traversal,options.maximumOps,context.facts.authority && [context.facts.authority.assignment,context.facts.authority.generation]]);
    const measure = createStartupTravel(state,context.plan.home,(leg,admitted) => measureRemoteLeg(context,{ ...leg,clock: 'action' },context.rooms,options.maximumOps,snapshots,admitted));
    const result = measure(context.plan,binding,Game.time,maximumLegs,guard);
    return result.status === 'complete' ? { ...result,observedAt: Game.time,facts: context.facts,rooms: context.rooms } : result;
  };
}
function validateOptions(options: StartupTravelOptions): void {
  if (!Number.isSafeInteger(options.maximumRooms) || options.maximumRooms < 1 || options.maximumRooms > 64) throw new Error('Invalid startup travel room bound');
  if (!Number.isSafeInteger(options.maximumOps) || options.maximumOps < 1 || options.maximumOps > 100000) throw new Error('Invalid startup travel search bound');
}
function validateRequest(request: NativeStartupTravelRequest, maximumLegs: number): void {
  if (!Number.isSafeInteger(maximumLegs) || maximumLegs < 0 || maximumLegs > 5) throw new Error('Invalid startup travel leg budget');
  if (request.traversal.mode !== 'known-safe' || request.traversal.username !== request.target.username) throw new Error('Invalid startup travel safety policy');
}
function walkable(point: NativeStartupTravelRequest['exit'], matrices: ReturnType<typeof prepareRemoteMatrices>): boolean {
  if (point.x === 0 || point.x === 49 || point.y === 0 || point.y === 49) return false;
  const matrix = matrices.matrix(point.room);
  return !!matrix && matrix.get(point.x,point.y) !== 255 && Game.rooms[point.room]!.getTerrain().get(point.x,point.y) !== TERRAIN_MASK_WALL;
}
