import { pathableRoomGap } from '../../capabilities/intel/room-gap';
import type { RoomGapBudget, RoomGapResult } from '../../capabilities/intel/room-gap';
import type { RoomGraphPorts } from '../../capabilities/intel/room-graph';
import { createIntelTraversal } from './traversal';
import type { IntelTraversalPolicy, IntelTraversalPorts } from './traversal-model';
export interface IntelGapRequest {
  origin: string; destination: string; tick: number; policy: IntelTraversalPolicy; budget: RoomGapBudget;
}
export type IntelGapResult = Extract<RoomGapResult, { status: 'unavailable' }>
  | (Extract<RoomGapResult, { status: 'found' }> & { confidence: 'known' | 'uncertain'; refreshRooms: string[] });
/** Strategic gap composes topology and admission; partial policy reads cannot certify a minimum. */
export function pathableIntelRoomGap(request: IntelGapRequest, ports: IntelTraversalPorts & Pick<RoomGraphPorts, 'exits'>,
  guard: () => boolean = () => true): IntelGapResult {
  const traversal = createIntelTraversal(ports, request.policy, request.tick, guard);
  const result = pathableRoomGap(request.origin, request.destination, { exits: ports.exits, allows: traversal.allows }, request.budget, guard);
  const incomplete = traversal.diagnostics().incomplete;
  if (result.status === 'unavailable') {
    return incomplete ? { ...result, reason: incomplete } : result;
  }
  const refreshRooms = result.route.slice(1).filter(room => traversal.assess(room).refresh);
  return { ...result, exact: result.exact && incomplete === undefined,
    confidence: refreshRooms.length ? 'uncertain' : 'known', refreshRooms };
}
