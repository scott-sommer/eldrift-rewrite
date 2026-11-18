import { roomCoordinates } from '../../core/geometry/room-grid';
import type { RoomGraphPorts } from './room-graph';
export interface ExplorationBudget { depth: number; reads: number; rooms: number }
export interface ExploredRoom { room: string; depth: number; route: string[] }
export type ExplorationIncomplete = 'admission' | 'room-budget' | 'exit-budget' | 'unknown-exits';
export interface ExplorationResult { rooms: ExploredRoom[]; reads: number; incomplete?: ExplorationIncomplete }
/** Exploration depth counts actual cardinal room crossings, not strategic diagonal gaps. */
export function exploreRooms(origin: string, ports: RoomGraphPorts, budget: ExplorationBudget,
  guard: () => boolean = () => true): ExplorationResult {
  roomCoordinates(origin);
  validateExplorationBudget(budget);
  const result: ExplorationResult = { rooms: [], reads: 0 };
  const queue: ExploredRoom[] = [{ room: origin, depth: 0, route: [origin] }], seen = new Set([origin]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]!;
    if (current.depth >= budget.depth) continue;
    if (!guard()) return { ...result, incomplete: 'admission' };
    if (result.rooms.length >= budget.rooms) return { ...result, incomplete: 'room-budget' };
    if (result.reads >= budget.reads) return { ...result, incomplete: 'exit-budget' };
    result.reads++;
    const exits = ports.exits(current.room);
    if (exits === undefined) { result.incomplete = 'unknown-exits'; continue; }
    for (const next of [...new Set(exits)].sort()) {
      validateCardinal(current.room, next);
      if (seen.has(next)) continue;
      if (!guard()) return { ...result, incomplete: 'admission' };
      seen.add(next);
      if (!ports.allows(next)) continue;
      if (result.rooms.length >= budget.rooms) return { ...result, incomplete: 'room-budget' };
      const discovered = { room: next, depth: current.depth + 1, route: [...current.route, next] };
      result.rooms.push(discovered);
      queue.push(discovered);
    }
  }
  return result;
}
export function validateExplorationBudget(budget: ExplorationBudget): void {
  for (const [value, maximum] of [[budget.depth,64], [budget.reads,10000], [budget.rooms,10000]]) {
    if (!Number.isSafeInteger(value) || value! < 0 || value! > maximum!) throw new Error('Invalid exploration budget');
  }
}
function validateCardinal(origin: string, next: string): void {
  const a = roomCoordinates(origin), b = roomCoordinates(next);
  if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) throw new Error('Exploration requires cardinal exits');
}
