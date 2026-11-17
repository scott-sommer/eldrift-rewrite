import { roomCoordinates } from '../../core/geometry/room-grid';
/** Keeper retains the legacy 4..6 sector flag, including the separately identified center room. */
export function classifyIntelRoom(room: string) {
  const point = roomCoordinates(room);
  const x = (point.x < 0 ? -point.x - 1 : point.x) % 10;
  const y = (point.y < 0 ? -point.y - 1 : point.y) % 10;
  return { highway: x === 0 || y === 0, keeper: x >= 4 && x <= 6 && y >= 4 && y <= 6, center: x === 5 && y === 5 };
}
