import type { Position } from '../../capabilities/movement/step';
import { validateAvoidancePosition } from '../../capabilities/movement/avoidance';
export interface PreparedMovementMatrices { version: string; matrix(room: string): CostMatrix | undefined }
/** Compose detached command-specific blockers over shared tick snapshots, preserving other callers. */
export function movementAvoidance(base: PreparedMovementMatrices, avoid: readonly Position[]): PreparedMovementMatrices {
  if (avoid.length > 10000) throw new Error('Movement avoidance tile budget exhausted');
  if (!avoid.length) return base;
  const cells = new Map<string, Position>();
  for (const position of avoid) {
    validateAvoidancePosition(position);
    cells.set(JSON.stringify([position.room,position.x,position.y]), { ...position });
  }
  const ordered = [...cells.entries()].sort(([a],[b]) => a.localeCompare(b));
  const rooms = new Map<string, Position[]>();
  for (const [,position] of ordered) {
    const group = rooms.get(position.room) ?? [];
    group.push(position);
    rooms.set(position.room, group);
  }
  return { version: JSON.stringify([base.version, ordered.map(([key]) => key)]), matrix(room) {
    const overlay = rooms.get(room), matrix = base.matrix(room);
    if (!overlay) return matrix;
    const result = matrix ?? new PathFinder.CostMatrix();
    for (const position of overlay) result.set(position.x,position.y,255);
    return result;
  } };
}
