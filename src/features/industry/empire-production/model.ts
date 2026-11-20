import type { EmpireProductionAssignment } from '../../../capabilities/industry/production/empire';
import type { ProductionStep } from '../../../capabilities/industry/production/model';
export interface EmpireProductionAdmission extends EmpireProductionAssignment { rootStock: number }
export interface EmpireProductionWindow extends Omit<EmpireProductionAssignment,'step'> {
  step: ProductionStep | null; context: string; rootTarget: number; observedRoot: number; remaining: number; initialStep: ProductionStep; retiring: boolean;
}
export interface EmpireProductionState { windows: EmpireProductionWindow[] }
