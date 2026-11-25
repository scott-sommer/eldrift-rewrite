import type { SpawnRequest } from '../../../../spawning/request';
import type { WorkOrder } from '../../../../work/assessment';
import type { StartupScheduledBirth } from '../../spawn-model';
import type { Position } from '../../../../movement/step';
import type { LaborTravelPlan } from './travel-model';
import type { quoteLaborTravel } from './travel';
export interface LaborProposalInput {
  observedAt: number; request: SpawnRequest; birth: StartupScheduledBirth; source: string; pickup: Position; order: WorkOrder; service: Position;
  policy: { horizon: number; maximumLoad: number; maximumWorkTicks: number; reserve: number };
}
export interface LaborProposalFacts {
  spawn: { id: string; position: Position };
  source: { id: string; position: Position; energy: number; capacity: number; freeCapacity: number; claimedEnergy: number; claimedCapacity: number; availableEnergy: number };
  target: { id: string; position: Position; kind: WorkOrder['kind']; remainingWork: number };
}
export interface LaborProposalPorts {
  now(): number;
  observe(input: LaborProposalInput): { status: 'observed'; facts: LaborProposalFacts } | { status: 'deferred'; reason: string };
  travel(plan: LaborTravelPlan, guard: () => boolean): ReturnType<typeof quoteLaborTravel>;
}
