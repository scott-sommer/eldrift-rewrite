import { adjacentRoom } from '../../core/geometry/room-grid';
import type { Position } from './step';
export interface MovementTransition {
  direction: number;
  local: Position;
  landing: Position;
}
const offsets = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]] as const;
/** Engine edge precedence is west, north, east, south, including corners. */
function landing(local: Position): Position {
  const { room, x, y } = local;
  if (x === 0) return { room: adjacentRoom(room, 7), x: 49, y };
  if (y === 0) return { room: adjacentRoom(room, 1), x, y: 49 };
  if (x === 49) return { room: adjacentRoom(room, 3), x: 0, y };
  if (y === 49) return { room: adjacentRoom(room, 5), x, y: 0 };
  return local;
}
/** Geometry only: caller must validate terrain, occupancy and accessible rooms. */
export function movementTransition(origin: Position, direction: number): MovementTransition | undefined {
  const offset = offsets[direction - 1];
  if (!Number.isInteger(direction) || !offset) return undefined;
  const local = { room: origin.room, x: origin.x + offset[0], y: origin.y + offset[1] };
  if (local.x < 0 || local.x > 49 || local.y < 0 || local.y > 49) return undefined;
  return { direction, local, landing: landing(local) };
}
/** PathFinder may describe the local exit or the next room's landing tile. */
export function stepDirection(origin: Position, next: Position): number {
  for (let direction = 1; direction <= 8; direction++) {
    const step = movementTransition(origin, direction);
    if (step && (same(step.local, next) || same(step.landing, next))) return direction;
  }
  return 0;
}
function same(a: Position, b: Position): boolean {
  return a.room === b.room && a.x === b.x && a.y === b.y;
}
