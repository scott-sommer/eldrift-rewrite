import { roomCoordinates } from '../../core/geometry/room-grid';
import type { RemoteAssessmentRequest, RemoteTravel } from './assessment-model';
export function validateRemoteTravel(value: RemoteTravel, request: RemoteAssessmentRequest): void {
  validateTimes(value);
  if (!Array.isArray(value.rooms) || !value.rooms.length || value.rooms.length > 64) throw new Error('Invalid remote route');
  if (value.rooms[0] !== request.home || value.rooms.at(-1) !== request.room || new Set(value.rooms).size !== value.rooms.length) throw new Error('Invalid remote route endpoints');
  const coordinates = value.rooms.map(roomCoordinates);
  for (let index = 1; index < coordinates.length; index++) {
    const a = coordinates[index-1]!, b = coordinates[index]!;
    if (Math.abs(a.x-b.x) + Math.abs(a.y-b.y) !== 1) throw new Error('Invalid remote route crossing');
  }
}

function validateTimes(value: RemoteTravel): void {
  if (![value.minerTicks,value.outboundTicks,value.returnTicks].every(time => Number.isFinite(time) && time >= 0)) throw new Error('Invalid remote travel time');
  if (!Number.isSafeInteger(value.operations) || value.operations < 0) throw new Error('Invalid remote path operations');
}
