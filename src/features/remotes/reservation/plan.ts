import type { RemoteAssignment, RemoteAssignmentDemand } from '../assignment-model';
import type { RemoteManagementRecord } from '../management/model';
import type { ReservationQuote } from './model';
import { remoteAssignmentDemands } from '../assignment-demand';
import { validReservationQuote } from './quote-validation';
import { reservationOwner } from './identity';
export interface ReservationPlan {
  owner: string; quote: ReservationQuote;
  demand: Extract<RemoteAssignmentDemand,{ kind: 'reserve' }>;
}
/** Only the current managed generation may turn its priced controller offer into automatic population. */
export function reservationPlan(lease: RemoteAssignment, record: RemoteManagementRecord, tick: number, maximumAge: number): ReservationPlan | undefined {
  if (!Number.isSafeInteger(maximumAge) || maximumAge < 0) throw new Error('Invalid reservation quote age');
  if (record.home !== lease.home || !record.managed.some(item => item.room === lease.plan.room && item.generation === lease.generation)) return undefined;
  const demand = remoteAssignmentDemands(lease,tick).find((item): item is ReservationPlan['demand'] => item.kind === 'reserve');
  if (!demand) return undefined;
  const quote = record.offers.find(offer => offer.room === demand.room)?.reservation?.quote;
  if (!validReservationQuote(quote,lease.home,demand.room,tick) || tick-quote.observedAt > maximumAge) return undefined;
  if (!sameController(demand.controller,quote.controller)) return undefined;
  const owner = reservationOwner({ home: demand.home,room: demand.room,generation: demand.generation });
  return { owner,quote,demand };
}
function sameController(left: ReservationPlan['demand']['controller'], right: ReservationQuote['controller']): boolean {
  return left.id === right.id && left.position.room === right.position.room && left.position.x === right.position.x && left.position.y === right.position.y;
}
