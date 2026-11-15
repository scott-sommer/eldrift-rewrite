import type { CoreCandidate } from '../../capabilities/planning/standard-candidates';
import type { LayoutCosts } from '../../capabilities/planning/selection';
import type { PlanProposal } from './plan-store';
export interface PlanningCandidate extends CoreCandidate { id: string; strategy: string }
export type CandidateStep =
  | { status: 'pending'; checkpoint: unknown }
  | { status: 'rejected'; reason: string }
  | { status: 'complete'; proposal: PlanProposal };
export interface PlanningJobInput {
  observation: string; policy: string; baseRevision: number;
  source: { revision: string; count: number; at: (index: number) => PlanningCandidate };
  weights: LayoutCosts; minimumImprovement: number; previousId?: string;
  step: (candidate: PlanningCandidate, checkpoint: unknown | undefined) => CandidateStep;
  validate: (proposal: PlanProposal) => boolean;
}
export interface PlanningJobCheckpoint {
  version: 1; signature: string; next: number; seen: string[]; rejected: number;
  pending?: { id: string; checkpoint: unknown };
  best?: PlanProposal; previous?: PlanProposal;
  lastRejection?: { id: string; reason: string };
}
