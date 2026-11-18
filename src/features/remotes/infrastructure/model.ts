import type { Position } from '../../../capabilities/movement/step';
import type { PlanState } from '../../planning/plan-model';
import type { RemoteAssignmentDemand } from '../assignment-model';
export type RemoteOutpostDemand = Extract<RemoteAssignmentDemand,{ kind: 'outpost' }>;
export interface RemoteInfrastructureRoute { source: string; target: Position; station: Position; path: Position[] }
export interface RemoteInfrastructureDraft {
  identity: string; sources: string[]; routes: RemoteInfrastructureRoute[];
}
export interface RemoteInfrastructureRecord {
  home: string; room: string; revision: number; generation: number; draft: RemoteInfrastructureDraft | null;
  plans: PlanState[]; stations: { source: string; position: Position }[];
}
