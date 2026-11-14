import type { StateSchema } from '../../persistence/versioned-state';
import { validProgress, validStage } from './model';
import type { MissionState, StageContract } from './model';
function validUnits(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(unit => typeof unit === 'string' && unit.length > 0)
    && new Set(value).size === value.length;
}
export function missionSchema(id: string, contracts: Readonly<Record<string, StageContract>>): StateSchema<MissionState> {
  if (!id) throw new Error('Mission ID is required');
  return {
    owner: 'missions', version: 1, migrations: {},
    initial: () => ({ id, status: 'draft', stageIndex: 0, stages: [], units: [] }),
    valid(value: unknown): value is MissionState {
      if (!value || typeof value !== 'object') return false;
      const state = value as Partial<MissionState>;
      if (state.id !== id || !validProgress(state) || !validUnits(state.units)) return false;
      return state.stages!.length <= 100 && state.stages!.every(stage => validStage(stage, contracts));
    },
  };
}
