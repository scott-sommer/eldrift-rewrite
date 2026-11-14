import type { Position } from './step';
/** Interior neighbors suitable for standing work; room exits are not workstations. */
export function adjacentWorkTiles(origin: Position): Position[] {
  const result: Position[] = [];
  for (let x = Math.max(1, origin.x - 1); x <= Math.min(48, origin.x + 1); x++) {
    for (let y = Math.max(1, origin.y - 1); y <= Math.min(48, origin.y + 1); y++) {
      if (x !== origin.x || y !== origin.y) result.push({ room: origin.room, x, y });
    }
  }
  return result;
}
