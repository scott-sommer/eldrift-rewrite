import { nativeRemoteRoute } from '../../../native-route';
import { nativeRemoteTraversalFor } from '../../../management/policy';
import { createIntelStore } from '../../../../../features/intel/store';
import { prepareRemoteMatrices } from '../../../assessment/matrices';
import type { StatePort } from '../../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../../config/model';
import type { PaidUnitContext } from '../../motion-observation/model';
import type { PaidCourierOpening } from '../../motion-observation/opening-model';
import type { createMatrixSnapshots } from '../../../../../adapters/screeps/matrix-snapshots';
export function paidContinuationContext(state: StatePort,context: PaidUnitContext,basis: PaidCourierOpening,config: Readonly<RuntimeConfig>,snapshots: ReturnType<typeof createMatrixSnapshots>,guard: () => boolean) {
  const username = Game.rooms[context.cohort.home]?.controller?.owner?.username;
  if (!username) return { status: 'deferred' as const,reason: 'continuation-home' };
  const policy = nativeRemoteTraversalFor(username,config);
  const base = nativeRemoteRoute(state,context.cohort.home,context.cohort.room,policy,config.remoteMaximumRouteRooms,false,guard);
  const destination = basis.continuation.stage === 'deliver' ? context.plan.home : context.plan.room;
  const origin = basis.continuation.stage === 'spawning' ? context.plan.spawn.exit : basis.observed.position;
  const active = nativeRemoteRoute(state,origin.room,destination,policy,config.remoteMaximumRouteRooms,false,guard);
  if (!base?.allowedRooms || !active?.allowedRooms) return { status: 'deferred' as const,reason: 'continuation-route' };
  const rooms = [...new Set([...base.allowedRooms,...active.allowedRooms])];
  if (rooms.length > config.remoteMaximumRouteRooms) return { status: 'deferred' as const,reason: 'continuation-room-bound' };
  const intel = createIntelStore(state),facts = { intel: (room: string) => intel.peek(room,Game.time).record };
  if (rooms.some(room => !Game.rooms[room] && !facts.intel(room).summary)) return { status: 'deferred' as const,reason: 'continuation-room-facts' };
  return { status: 'ready' as const,rooms,facts,matrices: prepareRemoteMatrices(facts,rooms,1,snapshots),version: JSON.stringify([base.version,active.version]) };
}
