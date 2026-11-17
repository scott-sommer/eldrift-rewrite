import { roomCoordinates } from '../../core/geometry/room-grid';
import { createRoomGraph } from './room-graph';
import type { GraphIncompleteReason, RoomGraphPorts } from './room-graph';
export interface RoomGapBudget { depth: number; reads: number }
export type RoomGapResult =
  | { status: 'found'; gap: number; route: string[]; exact: boolean; reads: number }
  | { status: 'unavailable'; reason: GraphIncompleteReason | 'depth-limit' | 'unreachable' | 'blocked-destination'; reads: number };
interface Frontier { room: string; gap: number; route: string[] }
/** Strategic gap counts a witnessed two-cardinal corner as one; route retains both actual hops. */
export function pathableRoomGap(origin: string, destination: string, ports: RoomGraphPorts, budget: RoomGapBudget,
  canContinue: () => boolean = () => true): RoomGapResult {
  roomCoordinates(origin); roomCoordinates(destination);
  if (!Number.isSafeInteger(budget.depth) || budget.depth < 0 || budget.depth > 64) throw new Error('Invalid room gap depth');
  const graph = createRoomGraph(ports, budget.reads, canContinue);
  if (!ports.allows(destination)) return { status: 'unavailable', reason: 'blocked-destination', reads: 0 };
  if (origin === destination) return { status: 'found', gap: 0, route: [origin], exact: true, reads: 0 };
  const queue: Frontier[] = [{ room: origin, gap: 0, route: [origin] }], seen = new Set([origin]);
  let limited = false;
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]!;
    if (current.gap >= budget.depth) { limited = true; continue; }
    const edges = graph.edges(current.room);
    for (const edge of edges) {
      const route = [...current.route, ...(edge.via ? [edge.via] : []), edge.room];
      if (edge.room === destination) return { status: 'found', gap: current.gap + 1, route,
        exact: graph.diagnostics().incomplete === undefined, reads: graph.diagnostics().reads };
      if (!seen.has(edge.room)) { seen.add(edge.room); queue.push({ room: edge.room, gap: current.gap + 1, route }); }
    }
    const failure = graph.diagnostics().incomplete;
    if (failure === 'admission' || failure === 'room-budget') break;
  }
  const diagnostics = graph.diagnostics();
  return { status: 'unavailable', reason: diagnostics.incomplete ?? (limited ? 'depth-limit' : 'unreachable'), reads: diagnostics.reads };
}
