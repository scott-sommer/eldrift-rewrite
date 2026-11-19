import { currentRoomReservation, selectedRoomController } from './reservation-admission';
import { copyPlain } from '../../../persistence/plain-data';
import { selectRemotePortfolio } from '../portfolio';
import { createRemoteAssignmentStore } from '../assignment-store';
import type { RemoteRoomPlan } from '../assignment-model';
import type { StatePort } from '../../../persistence/versioned-state';
import type { RemoteManagementPorts, RemoteManagementRecord, RemoteManagementRequest } from './model';
/** Live admission is independent of cached economics; assignment CAS remains the exclusive home owner. */
export function commitRemotePortfolio(state: StatePort, record: RemoteManagementRecord, request: RemoteManagementRequest,
  ports: RemoteManagementPorts, guard: () => boolean, stillCurrent: () => boolean = () => true) {
  const assignments = createRemoteAssignmentStore(state), revision = assignments.read().revision;
  const offers = copyPlain(record.offers).map(offer => ({ ...offer,quotes: manageable(assignments,record,offer.room,request.tick) && guard() && currentRoomReservation(offer,request,ports,guard) ? offer.quotes.filter(quote => {
    return manageable(assignments,record,offer.room,request.tick) && guard() && ports.current(quote,guard);
  }) : [] }));
  if (!guard()) return { status: 'deferred' as const };
  const portfolio = selectRemotePortfolio(offers,{ ...request.policy.portfolio,home: request.home,tick: request.tick });
  const plans: RemoteRoomPlan[] = [];
  for (const bundle of portfolio.bundles) {
    if (!guard()) return { status: 'deferred' as const };
    const summary = ports.summary(bundle.room);
    if (!sameInventory(summary?.sources.map(source => source.id),record.offers.find(offer => offer.room === bundle.room)!.sourceIds)) return { status: 'inventory-changed' as const };
    const offer = offers.find(offer => offer.room === bundle.room)!;
    plans.push({ room: bundle.room,sources: bundle.sources.map(source => source.source),infrastructure: request.policy.infrastructure,
      reserve: selectedRoomController(offer,summary,request) });
  }
  if (!guard()) return { status: 'deferred' as const };
  const scope = [...new Set([...record.managed.map(item => item.room).filter(room => manageable(assignments,record,room,request.tick)),...plans.map(plan => plan.room)])];
  if (!stillCurrent()) return { status: 'conflict' as const };
  const result = assignments.reconcile({ home: request.home,tick: request.tick,lifetime: request.policy.leaseLifetime,expectedRevision: revision,plans,scope });
  return { ...result,portfolio };
}
function sameInventory(current: string[] | undefined, expected: string[]): boolean {
  return !!current && JSON.stringify([...current].sort()) === JSON.stringify([...expected].sort());
}

function manageable(assignments: ReturnType<typeof createRemoteAssignmentStore>, record: RemoteManagementRecord, room: string, tick: number): boolean {
  const owner = assignments.owner(room,tick);
  return !owner || owner.home === record.home && record.managed.some(item => item.room === room && item.generation === owner.generation);
}
