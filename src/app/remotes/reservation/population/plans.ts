import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import { createRemoteAssignmentStore } from '../../../../features/remotes/assignment-store';
import { createRemoteManagementStore } from '../../../../features/remotes/management/store';
import { reservationPlan } from '../../../../features/remotes/reservation/plan';
import type { ReservationPlan } from '../../../../features/remotes/reservation/plan';
import { sameReservationQuote } from '../../../../features/remotes/reservation/equivalence';
import { createNativeReservationQuote } from '../native-quote';
import { nativeRemoteTraversal } from '../../management/policy';
import { reservationWorkEnabled } from './policy';
export function createNativeReservationPlans(state: StatePort) {
  return (home: string, config: Readonly<RuntimeConfig>, guard: () => boolean) => {
    const plans: ReservationPlan[] = [], room = Game.rooms[home];
    if (!reservationWorkEnabled(config) || !room?.controller?.my || room.controller.level < config.remoteMinimumRcl) return { complete: true,plans };
    const record = createRemoteManagementStore(state,home).read(), leases = createRemoteAssignmentStore(state).read().assignments.filter(lease => lease.home === home);
    const quote = createNativeReservationQuote(state,{ maximumRooms: config.remoteMaximumRouteRooms,maximumOps: config.remoteMaximumPathOps });
    for (const lease of leases) {
      if (!guard()) return { complete: false,plans: [] };
      const plan = reservationPlan(lease,record,Game.time,config.intelMaximumAge);
      if (!plan) continue;
      const current = quote({ home,room: plan.demand.room,tick: Game.time,bodyBudget: Math.min(config.remoteReservationBodyBudget,plan.quote.body.cost),
        minimumBufferTicks: config.remoteReservationMinimumBuffer,replacementMargin: config.remoteReservationMargin,traversal: nativeRemoteTraversal(room,config) },guard);
      if (current.status === 'quoted' && sameReservationQuote(plan.quote,current)) plans.push(plan);
    }
    return guard() ? { complete: true,plans } : { complete: false,plans: [] };
  };
}
