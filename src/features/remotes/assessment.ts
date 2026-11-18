import type { IntelTraversalDecision } from '../intel/traversal-model';
import { validateRemoteTravel } from './travel-validation';
import { roomCoordinates } from '../../core/geometry/room-grid';
import { framedIdentity } from '../../core/framed-identity';
import { copyPlain } from '../../persistence/plain-data';
import { createIntelTraversal } from '../intel/traversal';
import type { IntelRecord } from '../intel/model';
import { assessRemoteEconomics } from '../../capabilities/economy/remote-economics';
import { remoteReservation } from './reservation-view';
import type { RemoteAssessment, RemoteAssessmentPorts, RemoteAssessmentRequest } from './assessment-model';
/** Assessment never claims an outpost, changes reservations or interprets missing vision as an empty room. */
export function assessRemoteSource(input: RemoteAssessmentRequest, ports: RemoteAssessmentPorts,
  guard: () => boolean = () => true): RemoteAssessment {
  const request = copyPlain(input); validateRequest(request);
  const id = 'remote-source:' + framedIdentity([request.home,request.source]);
  if (request.home === request.room) return { status: 'rejected', id, reason: 'home-room', refresh: false };
  if (request.assignedHome && request.assignedHome !== request.home) return { status: 'rejected', id, reason: 'assigned-elsewhere', refresh: false };
  const records = new Map<string,IntelRecord>();
  const intel = (room: string) => {
    if (!records.has(room)) records.set(room,copyPlain(ports.intel(room)));
    return records.get(room)!;
  };
  const traversal = createIntelTraversal({ intel, status: ports.status },request.traversal,request.tick,guard);
  const decision = traversal.assess(request.room);
  if (decision.status === 'blocked') return deniedAssessment(id,decision);
  const summary = intel(request.room).summary!;
  if (summary.controller?.owner !== null && summary.controller?.owner !== undefined) return { status: 'rejected', id, reason: 'owned-room', refresh: false };
  const reservation = remoteReservation(summary,request.traversal.username,request.tick);
  if (reservation.state === 'foreign') return { status: 'rejected', id, reason: 'foreign-reservation', refresh: true };
  if (reservation.state === 'ours' && !reservation.remainingTicks) return { status: 'deferred', id, reason: 'reservation-expired', refresh: true };
  const source = summary.sources.find(source => source.id === request.source);
  if (!source) return { status: 'rejected', id, reason: 'missing-source', refresh: true };
  const travel = copyPlain(ports.estimate({ request: copyPlain(request), target: { room: request.room, x: source.x, y: source.y },
    traversal: { ...traversal }, intel: room => copyPlain(intel(room)) },guard));
  if (travel.status !== 'complete') return { status: 'deferred', id, reason: 'travel:' + travel.reason, refresh: travelRefresh(travel.reason) };
  validateRemoteTravel(travel,request);
  const unsafe = travel.rooms.some(room => !traversal.allows(room));
  const incomplete = traversal.diagnostics().incomplete;
  if (incomplete) return { status: 'deferred', id, reason: 'travel:' + incomplete, refresh: false };
  if (unsafe) return { status: 'deferred', id, reason: 'travel:room-policy', refresh: true };
  const economics = assessRemoteEconomics({ ...request.economics, capacity: source.capacity,
    miner: { ...request.economics.miner, travelTicks: travel.minerTicks },
    hauler: { ...request.economics.hauler, outboundTicks: travel.outboundTicks, returnTicks: travel.returnTicks } });
  return { status: 'assessed', id, source: request.source, home: request.home, room: request.room,
    observedAt: summary.observedAt, policy: copyPlain(request.economics), sourceFacts: copyPlain(source), reservation, travel: copyPlain(travel), economics };
}
function validateRequest(request: RemoteAssessmentRequest): void {
  roomCoordinates(request.home); roomCoordinates(request.room);
  if (request.assignedHome !== undefined) roomCoordinates(request.assignedHome);
  if (typeof request.source !== 'string' || !request.source || request.source.length > 256 || !Number.isSafeInteger(request.tick) || request.tick < 0) throw new Error('Invalid remote assessment identity');
  if (request.traversal.mode !== 'known-safe') throw new Error('Remote production requires known-safe traversal');
}

function deniedAssessment(id: string, decision: Extract<IntelTraversalDecision, { status: 'blocked' }>): RemoteAssessment {
  const deferred = decision.refresh || ['admission','room-budget','temporary'].includes(decision.reason);
  return { status: deferred ? 'deferred' : 'rejected', id, reason: 'traversal:' + decision.reason, refresh: decision.refresh };
}
function travelRefresh(reason: string): boolean {
  return !['admission','room-budget','room-limit','immobile','home-unavailable','home-anchor','body-budget'].includes(reason);
}
