export interface MissionStage { kind: string; options: unknown; criteria: unknown }
export interface MissionState {
  id: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  stageIndex: number;
  stages: MissionStage[];
  units: string[];
}
export interface StageContract {
  validOptions(value: unknown): boolean;
  validCriteria(value: unknown): boolean;
}
export function validStage(value: unknown, contracts: Readonly<Record<string, StageContract>>): value is MissionStage {
  if (!value || typeof value !== 'object') return false;
  const stage = value as Partial<MissionStage>;
  if (typeof stage.kind !== 'string' || !Object.hasOwn(contracts, stage.kind)) return false;
  const contract = contracts[stage.kind]!;
  return contract.validOptions(stage.options) && contract.validCriteria(stage.criteria);
}
export function validProgress(state: Partial<MissionState>): boolean {
  if (!Array.isArray(state.stages) || !Number.isSafeInteger(state.stageIndex)) return false;
  const index = state.stageIndex!;
  if (index < 0 || index > state.stages.length) return false;
  if (state.status === 'active') return index < state.stages.length;
  if (state.status === 'completed') return index === state.stages.length;
  return state.status === 'draft' || state.status === 'cancelled';
}
