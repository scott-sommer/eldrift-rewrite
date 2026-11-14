import type { Position } from './step';
function range(a: Position, b: Position): number {
  return a.room === b.room ? Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) : Infinity;
}
/** Candidates must already be walkable. This selects an endpoint, not a threat-safe route. */
export function selectRetreat(candidates: readonly Position[], threats: readonly Position[], clearance = 3): Position | undefined {
  if (!Number.isSafeInteger(clearance) || clearance < 0) throw new Error('Invalid retreat clearance');
  const distance = (tile: Position) => threats.reduce((nearest, threat) => Math.min(nearest, range(tile, threat)), Infinity);
  return [...candidates].filter(tile => distance(tile) > clearance)
    .sort((a, b) => distance(b) - distance(a) || a.x - b.x || a.y - b.y)[0];
}
