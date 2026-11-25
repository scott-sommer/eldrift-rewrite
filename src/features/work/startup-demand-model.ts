import type { SpawnPlacement } from '../../capabilities/spawning/request';
import type { WorkerMode } from './policy';
export interface StartupLaborDemand {
  home: string; mode: WorkerMode; enabled: boolean; level: number;
  budget: number; recipe: 'standard' | 'balanced'; maximumParts: number; maximumUnits: number;
  id: string; placement: SpawnPlacement; horizon: number; observedAt: number;
  replacementTravel: number; replacementMargin: number;
}
