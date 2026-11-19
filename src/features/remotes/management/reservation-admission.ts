import type { RoomSummary } from '../../intel/model';
import type { RemoteRoomOffer } from '../portfolio-model';
import type { RemoteManagementPorts, RemoteManagementRequest } from './model';
/** Explicit quotes require an independent live admission port; legacy flags keep their existing semantics. */
export function currentRoomReservation(offer: RemoteRoomOffer, request: RemoteManagementRequest, ports: RemoteManagementPorts, guard: () => boolean): boolean {
  const reservation = offer.reservation;
  if (!reservation) return true;
  if (!guard()) return false;
  const quote = reservation.quote;
  if (request.tick-quote.observedAt > request.policy.portfolio.maximumAge) return false;
  if (!sameController(ports.summary(offer.room),quote.controller,request.policy.traversal.username)) return false;
  return !!ports.currentReservation?.(quote,guard) && guard();
}
export function selectedRoomController(offer: RemoteRoomOffer, summary: RoomSummary | undefined, request: RemoteManagementRequest) {
  if (offer.reservation === null) return null;
  if (offer.reservation) return offer.reservation.quote.controller;
  const controller = summary?.controller;
  return request.policy.reserve && controller ? { id: controller.id,position: { room: offer.room,x: controller.x,y: controller.y } } : null;
}
function sameController(summary: RoomSummary | undefined, target: { id: string; position: { x: number; y: number } }, username: string): boolean {
  const controller = summary?.controller;
  return !!controller && controller.id === target.id && controller.x === target.position.x && controller.y === target.position.y
    && !controller.owner && (!controller.reservation || controller.reservation.username === username);
}
