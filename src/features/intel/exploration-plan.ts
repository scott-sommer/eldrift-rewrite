import { exploreRooms, validateExplorationBudget } from '../../capabilities/intel/exploration';
import type { ExploredRoom, ExplorationBudget, ExplorationIncomplete } from '../../capabilities/intel/exploration';
import type { RoomGraphPorts } from '../../capabilities/intel/room-graph';
import { copyPlain } from '../../persistence/plain-data';
import { createIntelTraversal } from './traversal';
import { intelReadModel } from './freshness';
import { validScoutRoom } from './scout-validation';
import { natural } from './validation';
import type { IntelRecord } from './model';
import type { IntelTraversalPolicy, IntelTraversalPorts } from './traversal-model';
export interface ExplorationPlanRequest {
  home: string; tick: number; policy: IntelTraversalPolicy; budget: ExplorationBudget;
  assigned: readonly string[]; maximumTargets: number;
}
export interface ExplorationTarget extends ExploredRoom { reason: 'unknown' | 'stale'; age: number | null }
export interface ExplorationPlan {
  targets: ExplorationTarget[]; discovered: number; reads: number; paused: boolean;
  incomplete?: ExplorationIncomplete | 'room-budget';
}
/** Fresh observer intel suppresses demand; assignment/spawning/movement remain separate owners. */
export function planExploration(request: ExplorationPlanRequest, ports: IntelTraversalPorts & Pick<RoomGraphPorts, 'exits'>,
  guard: () => boolean = () => true): ExplorationPlan {
  validateRequest(request);
  validateExplorationBudget(request.budget);
  const snapshots = new Map<string, IntelRecord>(), assigned = new Set(request.assigned);
  const read = (room: string): IntelRecord => {
    if (!snapshots.has(room)) snapshots.set(room, copyPlain(ports.intel(room)));
    return snapshots.get(room)!;
  };
  const traversal = createIntelTraversal({ intel: read, status: ports.status }, request.policy, request.tick, guard);
  if (!request.maximumTargets) return { targets: [], discovered: 0, reads: 0, paused: true };
  const explored = exploreRooms(request.home, { exits: ports.exits, allows: traversal.allows }, request.budget, guard);
  const targets: ExplorationTarget[] = [];
  let incomplete = traversal.diagnostics().incomplete ?? explored.incomplete;
  for (const room of explored.rooms) {
    if (!guard()) { incomplete = 'admission'; break; }
    if (assigned.has(room.room)) continue;
    const view = intelReadModel(read(room.room), request.tick, request.policy.maximumAge);
    if (view.freshness !== 'fresh') targets.push({ ...room, reason: view.freshness, age: view.summaryAge });
  }
  targets.sort(compareTargets);
  return { targets: targets.slice(0, request.maximumTargets), discovered: explored.rooms.length, reads: explored.reads,
    paused: false, ...(incomplete ? { incomplete } : {}) };
}
function compareTargets(a: ExplorationTarget, b: ExplorationTarget): number {
  if (a.reason !== b.reason) return a.reason === 'unknown' ? -1 : 1;
  return (b.age ?? 0) - (a.age ?? 0) || a.depth - b.depth || a.room.localeCompare(b.room);
}
function validateRequest(request: ExplorationPlanRequest): void {
  if (request.policy.mode !== 'exploration') throw new Error('Exploration needs explicit exploration traversal policy');
  if (!validScoutRoom(request.home) || !natural(request.maximumTargets) || request.maximumTargets > 1000) throw new Error('Invalid exploration target request');
  if (request.assigned.length > 10000) throw new Error('Exploration assignment budget exceeded');
  for (const room of request.assigned) if (!validScoutRoom(room)) throw new Error('Invalid exploration assignment');
}
