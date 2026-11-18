import type { StatePort } from '../../../persistence/versioned-state';
import { createIntelStore } from '../../../features/intel/store';
import { createIntelTraversal } from '../../../features/intel/traversal';
import { remoteReservation } from '../../../features/remotes/reservation-view';
import type { RemoteManagementRequest } from '../../../features/remotes/management/model';
import type { RemoteQuote } from '../../../features/remotes/portfolio-model';
import { nativeScoutIntelPorts } from '../../native-scout-policy';
import { remoteBodiesWithinBudget } from '../assessment/body-budget';
/** Recheck current source facts, home budget, ownership/reservation and every retained travel room before publishing leases. */
export function currentRemoteQuote(state: StatePort, request: RemoteManagementRequest, quote: RemoteQuote,
  refresh: (rooms: readonly string[]) => void, guard: () => boolean): boolean {
  if (!guard()) return false;
  const facts = quote.assessment, home = Game.rooms[request.home];
  if (!home?.controller?.my || home.controller.owner?.username !== request.policy.traversal.username) return false;
  if (!remoteBodiesWithinBudget(facts.policy,home.energyCapacityAvailable)) return false;
  if (JSON.stringify(facts.policy) !== JSON.stringify(request.policy.economics)) return false;
  refresh(facts.travel.rooms);
  const summary = createIntelStore(state).peek(facts.room,Game.time).record.summary;
  if (!summary || summary.controller?.owner || !sourceUnchanged(summary.sources,facts.sourceFacts)) return false;
  const reservation = remoteReservation(summary,request.policy.traversal.username,Game.time);
  if (reservation.state === 'foreign' || reservation.state === 'ours' && !reservation.remainingTicks) return false;
  const traversal = createIntelTraversal(nativeScoutIntelPorts(state),request.policy.traversal,Game.time,guard);
  return facts.travel.rooms.every(room => traversal.allows(room)) && !traversal.diagnostics().incomplete;
}
function sourceUnchanged(sources: { id: string; x: number; y: number; capacity: number }[], expected: { id: string; x: number; y: number; capacity: number }): boolean {
  const source = sources.find(source => source.id === expected.id);
  return !!source && source.x === expected.x && source.y === expected.y && source.capacity === expected.capacity;
}
