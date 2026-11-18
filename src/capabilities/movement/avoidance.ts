import type { Position } from './step';
export function validateAvoidancePosition(position: Position): void {
  if (typeof position.room !== 'string' || !position.room) throw new Error('Invalid avoidance room');
  for (const value of [position.x, position.y]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 49) throw new Error('Invalid avoidance position');
  }
}
/** Chebyshev threat radius; current tile may be omitted so an endangered unit can leave. */
export function threatAvoidance(threats: readonly Position[], radius: number, current?: Position): Position[] {
  if (!Number.isSafeInteger(radius) || radius < 0 || radius > 49 || threats.length > 1000) throw new Error('Invalid threat avoidance budget');
  if (current) validateAvoidancePosition(current);
  const cells = new Map<string, Position>();
  for (const threat of threats) {
    validateAvoidancePosition(threat);
    addThreat(threat, radius, cells, current);
  }
  return [...cells.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([,position]) => position);
}
function addThreat(threat: Position, radius: number, cells: Map<string, Position>, current?: Position): void {
  for (let x = Math.max(0,threat.x-radius); x <= Math.min(49,threat.x+radius); x++) {
    for (let y = Math.max(0,threat.y-radius); y <= Math.min(49,threat.y+radius); y++) {
      if (current && current.room === threat.room && current.x === x && current.y === y) continue;
      const key = JSON.stringify([threat.room,x,y]);
      if (!cells.has(key) && cells.size >= 10000) throw new Error('Threat avoidance tile budget exhausted');
      cells.set(key, { room: threat.room, x, y });
    }
  }
}
