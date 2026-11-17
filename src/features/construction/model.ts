import type { PlanEntry } from '../planning/plan-model';
import type { AssessmentInput } from '../../capabilities/planning/assessment-model';
export interface ConstructionObject { id: string; type: string; x: number; y: number; owned: boolean }
export interface ConstructionObservation {
  level: number; stageLevel?: number; storedEnergy: number; terrain: AssessmentInput['terrain']; objects: AssessmentInput['objects'];
  structures: readonly ConstructionObject[]; sites: readonly ConstructionObject[];
  completed: ReadonlySet<string>; temporarilyOccupied: ReadonlySet<string>;
  limits: Readonly<Record<string, readonly number[]>>;
  globalSites: number; globalSiteLimit: number; roomSiteLimit: number;
}
export type ConstructionStatus = 'built' | 'site-existing' | 'eligible' | 'waiting-for-RCL'
  | 'waiting-for-budget' | 'temporarily-blocked' | 'invalid';
export interface ConstructionDecision { entry: PlanEntry; status: ConstructionStatus; reason: string }
