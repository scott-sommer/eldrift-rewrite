import { roomCoordinates } from '../../core/geometry/room-grid';
import type { RemoteAssessmentRequest, RemoteTravel } from './assessment-model';
export function validateRemoteTravel(value: RemoteTravel, request: Pick<RemoteAssessmentRequest, 'home' | 'room'>): void {
  validateTimes(value);
  validateRemoteRoute(value.rooms,request);
}
export function validateRemoteRoute(rooms: string[], request: Pick<RemoteAssessmentRequest, 'home' | 'room'>): void {
  if (!Array.isArray(rooms) || !rooms.length || rooms.length > 64) throw new Error('Invalid remote route');
  if (rooms[0] !== request.home || rooms.at(-1) !== request.room || new Set(rooms).size !== rooms.length) throw new Error('Invalid remote route endpoints');
  const coordinates = rooms.map(roomCoordinates);
  for (let index = 1; index < coordinates.length; index++) {
    const a = coordinates[index-1]!, b = coordinates[index]!;
    if (Math.abs(a.x-b.x) + Math.abs(a.y-b.y) !== 1) throw new Error('Invalid remote route crossing');
  }
}

function validateTimes(value: RemoteTravel): void {
  if (![value.minerTicks,value.minerReturnTicks,value.outboundTicks,value.returnTicks].every(time => Number.isFinite(time) && time >= 0)) throw new Error('Invalid remote travel time');
  if (!Number.isSafeInteger(value.operations) || value.operations < 0) throw new Error('Invalid remote path operations');
}
