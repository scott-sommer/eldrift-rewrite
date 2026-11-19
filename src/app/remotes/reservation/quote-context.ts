import type { StatePort } from '../../../persistence/versioned-state';
import { createIntelStore } from '../../../features/intel/store';
import { bufferedReserver } from '../../../capabilities/spawning/reservation-recipes';
import { movementPosition } from '../../../adapters/screeps/movement-traffic';
import type { ReservationQuoteRequest } from '../../../features/remotes/reservation/model';
import { createRemoteObservationRefresh } from '../native-observations';
import { nativeRemoteRoute } from '../native-route';
import { nativeRemoteTarget } from '../native-target';
export interface ReservationQuoteOptions { maximumRooms: number; maximumOps: number }
export function createReservationQuoteContext(state: StatePort, options: ReservationQuoteOptions) {
  const intel = createIntelStore(state), refresh = createRemoteObservationRefresh(state);
  return (request: ReservationQuoteRequest, guard: () => boolean) => {
    const home = Game.rooms[request.home];
    if (!home?.controller?.my || home.controller.owner?.username !== request.traversal.username) return { status: 'infeasible' as const,reason: 'home' };
    const body = bufferedReserver(Math.min(request.bodyBudget,home.energyCapacityAvailable),2);
    if (!body) return { status: 'infeasible' as const,reason: 'body-budget' };
    refresh([request.home,request.room]);
    const summary = intel.peek(request.room,Game.time).record.summary, controller = summary?.controller;
    if (!controller) return { status: 'deferred' as const,reason: 'controller-unknown' };
    if (!nativeRemoteTarget(state,request.room,request.traversal.username)) return { status: 'infeasible' as const,reason: 'controller-owner' };
    const route = nativeRemoteRoute(state,request.home,request.room,request.traversal,options.maximumRooms,false,guard);
    if (!route?.allowedRooms) return { status: 'deferred' as const,reason: 'route' };
    const anchor = home.storage ?? home.find(FIND_MY_SPAWNS)[0];
    if (!anchor) return { status: 'deferred' as const,reason: 'home-anchor' };
    return { status: 'ready' as const,request,body,origin: movementPosition(anchor.pos),rooms: [...route.allowedRooms],
      controller: { id: controller.id,position: { room: request.room,x: controller.x,y: controller.y } },observedAt: summary.observedAt,
      intel: (room: string) => intel.peek(room,Game.time).record };
  };
}
export type ReservationTravelContext = Extract<ReturnType<ReturnType<typeof createReservationQuoteContext>>,{ status: 'ready' }>;
