import type { Position } from '../../capabilities/movement/step';
export interface ParkingUnit { id: string; position: Position }
/** Keep controller-adjacent tiles free for reclaiming; retain valid parking as the roster changes. */
export function planUpgradeParking(controller: Position, anchor: Position, units: readonly ParkingUnit[], standable: (position: Position) => boolean) {
  const candidates = parkingTiles(controller, anchor).filter(standable);
  const available = new Map(candidates.map(position => [key(position), position]));
  const result = new Map<string, Position>();
  const sorted = [...units].sort((a, b) => a.id.localeCompare(b.id));
  for (const unit of sorted) {
    const position = available.get(key(unit.position));
    if (!position) continue;
    result.set(unit.id, position);
    available.delete(key(position));
  }
  for (const unit of sorted.filter(unit => !result.has(unit.id))) {
    const position = available.values().next().value;
    if (!position) break;
    result.set(unit.id, position);
    available.delete(key(position));
  }
  return result;
}
function parkingTiles(controller: Position, anchor: Position): Position[] {
  if (controller.room !== anchor.room) return [];
  const positions: Position[] = [];
  for (let y = Math.max(1, anchor.y - 3); y <= Math.min(48, anchor.y + 3); y++) {
    for (let x = Math.max(1, anchor.x - 3); x <= Math.min(48, anchor.x + 3); x++) {
      if (Math.max(Math.abs(x - controller.x), Math.abs(y - controller.y)) > 3) positions.push({ room: anchor.room, x, y });
    }
  }
  return positions.sort((a, b) => range(a, anchor) - range(b, anchor) || a.y - b.y || a.x - b.x);
}
const range = (a: Position, b: Position) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const key = (position: Position) => position.room + ':' + position.x + ':' + position.y;
