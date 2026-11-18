import { copyPlain } from '../../../persistence/plain-data';
import { remoteBodiesWithinBudget } from './body-budget';
import type { StatePort } from '../../../persistence/versioned-state';
import type { Position } from '../../../capabilities/movement/step';
import { createIntelStore } from '../../../features/intel/store';
import { assessRemoteSource } from '../../../features/remotes/assessment';
import type { RemoteAssessmentRequest } from '../../../features/remotes/assessment-model';
import { createMatrixSnapshots } from '../../../adapters/screeps/matrix-snapshots';
import { movementPosition } from '../../../adapters/screeps/movement-traffic';
import { remoteAssessmentRoute } from './route';
import { measureRemoteTravel } from './travel';
export interface NativeRemoteAssessmentOptions { maximumRooms: number; maximumOps: number; origin?(home: string): Position | undefined }
/** Read-only assessment service; runtime demand and mission commits remain separate owners. */
export function createNativeRemoteAssessment(state: StatePort, options: NativeRemoteAssessmentOptions) {
  if (!Number.isSafeInteger(options.maximumRooms) || options.maximumRooms < 1 || options.maximumRooms > 64) throw new Error('Invalid remote room limit');
  if (!Number.isSafeInteger(options.maximumOps) || options.maximumOps < 1) throw new Error('Invalid remote search limit');
  const intel = createIntelStore(state), snapshots = createMatrixSnapshots();
  return (request: RemoteAssessmentRequest, guard: () => boolean = () => true) => {
    const snapshot = copyPlain(request);
    if (snapshot.tick !== Game.time) throw new Error('Native remote assessment tick mismatch');
    return assessRemoteSource(snapshot,{ intel: room => intel.peek(room,snapshot.tick,snapshot.traversal.maximumAge).record,
      status: room => Game.map.getRoomStatus(room)?.status ?? 'unknown',
      estimate(context,canContinue) {
        const home = Game.rooms[context.request.home];
        if (!home?.controller?.my || home.controller.owner?.username !== context.request.traversal.username) return { status: 'deferred',reason: 'home-unavailable' };
        if (!remoteBodiesWithinBudget(context.request.economics,home.energyCapacityAvailable)) return { status: 'deferred',reason: 'body-budget' };
        const origin = options.origin ? options.origin(context.request.home) : homeOrigin(home);
        if (!origin) return { status: 'deferred',reason: 'home-anchor' };
        const route = remoteAssessmentRoute(context,options.maximumRooms,canContinue);
        if (route.status !== 'complete') return route;
        return measureRemoteTravel(context,origin,route.rooms,options.maximumOps,snapshots,canContinue);
      } },guard);
  };
}
function homeOrigin(room: Room): Position | undefined {
  const anchor = room.storage ?? room.find(FIND_MY_SPAWNS).sort((a,b) => a.id.localeCompare(b.id))[0];
  return anchor ? movementPosition(anchor.pos) : undefined;
}
