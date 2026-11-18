import type { StatePort } from '../../../persistence/versioned-state';
import { createIntelStore } from '../../../features/intel/store';
import { createIntelTraversal } from '../../../features/intel/traversal';
import type { RoomSummary } from '../../../features/intel/model';
import { remoteReservation } from '../../../features/remotes/reservation-view';
import type { RemoteManagementRequest } from '../../../features/remotes/management/model';
import type { RemoteQuote } from '../../../features/remotes/portfolio-model';
import { nativeScoutIntelPorts } from '../../native-scout-policy';
import { remoteBodiesWithinBudget } from '../assessment/body-budget';
/** Native facts are immutable within a tick; reuse a request snapshot while assignment CAS remains independent. */
export function createCurrentRemoteAdmission(state: StatePort, request: RemoteManagementRequest,
  refresh: (rooms: readonly string[]) => void, guard: () => boolean) {
  const intel = createIntelStore(state), summaries = new Map<string,RoomSummary | null>();
  const native = nativeScoutIntelPorts(state), traversal = createIntelTraversal({ ...native,intel(room) { refresh([room]); return native.intel(room); } },request.policy.traversal,Game.time,guard);
  const home = Game.rooms[request.home], policyIdentity = JSON.stringify(request.policy.economics);
  const affordable = readyHome(home,request) && remoteBodiesWithinBudget(request.policy.economics,home!.energyCapacityAvailable);
  const admitted = () => guard() && !traversal.diagnostics().incomplete;
  function summary(room: string): RoomSummary | null {
    if (!summaries.has(room)) { refresh([room]); summaries.set(room,intel.peek(room,Game.time).record.summary); }
    return summaries.get(room)!;
  }
  return { guard: admitted,current(quote: RemoteQuote): boolean {
    if (!admitted() || !affordable) return false;
    const facts = quote.assessment;
    if (JSON.stringify(facts.policy) !== policyIdentity) return false;
    const room = summary(facts.room);
    if (!eligibleSource(room,facts.sourceFacts)) return false;
    const reservation = remoteReservation(room,request.policy.traversal.username,Game.time);
    if (reservation.state === 'foreign' || reservation.state === 'ours' && !reservation.remainingTicks) return false;
    return facts.travel.rooms.every(room => traversal.allows(room)) && admitted();
  } };
}
function readyHome(home: Room | undefined, request: RemoteManagementRequest): boolean {
  return !!home?.controller?.my && home.controller.owner?.username === request.policy.traversal.username;
}
function sourceUnchanged(sources: { id: string; x: number; y: number; capacity: number }[], expected: { id: string; x: number; y: number; capacity: number }): boolean {
  const source = sources.find(source => source.id === expected.id);
  return !!source && source.x === expected.x && source.y === expected.y && source.capacity === expected.capacity;
}

function eligibleSource(room: RoomSummary | null, source: RemoteQuote['assessment']['sourceFacts']): room is RoomSummary {
  return !!room && !room.controller?.owner && sourceUnchanged(room.sources,source);
}
