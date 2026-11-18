import type { Position } from '../../capabilities/movement/step';
export interface RemoteControllerTarget { id: string; position: Position }
export interface RemoteRoomPlan {
  room: string; sources: string[]; reserve: RemoteControllerTarget | null;
  infrastructure: { roads: boolean; containers: boolean } | null;
}
export interface RemoteAssignment {
  id: string; home: string; plan: RemoteRoomPlan;
  generation: number; renewedAt: number; expiresAt: number;
}
export interface RemoteAssignmentState { revision: number; clock: number; assignments: RemoteAssignment[] }
export interface RemoteAssignmentBatch {
  home: string; expectedRevision: number; tick: number; lifetime: number; plans: RemoteRoomPlan[];
  /** Optional room scope patches only these leases; other assignments retain their exact expiry and generation. */
  scope?: string[];
}
export type RemoteAssignmentResult =
  | { status: 'applied'; revision: number; assignments: RemoteAssignment[] }
  | { status: 'conflict'; room: string; home: string }
  | { status: 'stale'; revision: number }
  | { status: 'capacity' };
export interface RemoteDemandAuthority { assignment: string; generation: number; expiresAt: number }
export type RemoteAssignmentDemand = RemoteDemandAuthority & { id: string; home: string; room: string } & (
  | { kind: 'mine'; source: string }
  | { kind: 'reserve'; controller: RemoteControllerTarget }
  | { kind: 'outpost'; infrastructure: NonNullable<RemoteRoomPlan['infrastructure']> }
);
