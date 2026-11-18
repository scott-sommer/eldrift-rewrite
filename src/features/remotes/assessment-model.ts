import type { Position } from '../../capabilities/movement/step';
import type { RemoteEconomicsInput, RemoteEconomicsResult } from '../../capabilities/economy/remote-model';
import type { IntelTraversalPolicy, IntelTraversalPorts } from '../intel/traversal-model';
import type { createIntelTraversal } from '../intel/traversal';
import type { IntelRecord, IntelSource } from '../intel/model';
export interface RemoteEconomicPolicy extends Omit<RemoteEconomicsInput, 'capacity' | 'miner' | 'hauler'> {
  miner: Omit<RemoteEconomicsInput['miner'], 'travelTicks'>;
  hauler: Omit<RemoteEconomicsInput['hauler'], 'outboundTicks' | 'returnTicks'>;
}
export interface RemoteAssessmentRequest {
  home: string; room: string; source: string; tick: number; assignedHome?: string;
  traversal: IntelTraversalPolicy; economics: RemoteEconomicPolicy;
}
export interface RemoteTravel {
  status: 'complete'; minerTicks: number; outboundTicks: number; returnTicks: number;
  rooms: string[]; operations: number;
}
export type RemoteTravelResult = RemoteTravel | { status: 'deferred'; reason: string };
export interface RemoteEstimateContext {
  request: Readonly<RemoteAssessmentRequest>; target: Position;
  traversal: ReturnType<typeof createIntelTraversal>; intel(room: string): IntelRecord;
}
export interface RemoteAssessmentPorts extends IntelTraversalPorts {
  estimate(context: RemoteEstimateContext, guard: () => boolean): RemoteTravelResult;
}
export interface RemoteReservation {
  state: 'none' | 'ours' | 'foreign'; username: string | null; remainingTicks: number; observedAt: number;
}
export type RemoteAssessment =
  | { status: 'deferred' | 'rejected'; id: string; reason: string; refresh: boolean }
  | { status: 'assessed'; id: string; source: string; home: string; room: string; observedAt: number;
      sourceFacts: IntelSource; reservation: RemoteReservation; travel: RemoteTravel; economics: RemoteEconomicsResult };
