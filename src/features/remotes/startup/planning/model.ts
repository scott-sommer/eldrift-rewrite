import type { StartupDeliveryInput } from '../../../../capabilities/economy/startup/delivery-model';
import type { StartupProjectCheckpoint } from '../../../../capabilities/economy/startup/checkpoints/project-model';
import type { StartupSpawnInput } from '../../../../capabilities/economy/startup/spawn-model';
import type { SpawnRequest } from '../../../../capabilities/spawning/request';
import type { forecastStartupProject } from '../../../../capabilities/economy/startup/project';
export interface StartupPlanningContext {
  room: string; source: string; generation: number; binding: string; observedAt: number; expiresAt: number;
}
export interface StartupPlanningQuery extends StartupPlanningContext { tick: number; input: StartupDeliveryInput }
export interface StartupPlanningRequest extends StartupPlanningQuery { expectedRevision: number }
type RequestWire = Omit<SpawnRequest,'home' | 'placement'> & { home: string | null; placement: NonNullable<SpawnRequest['placement']> | null };
type SpawnWire = Omit<StartupSpawnInput,'liveNames' | 'requests'> & { liveNames: string[]; requests: RequestWire[] };
export type StartupPlanningInput = Omit<StartupDeliveryInput,'project'> & {
  project: Omit<StartupDeliveryInput['project'],'spawning'> & { spawning: SpawnWire };
};
export interface StartupPlanningJob extends StartupPlanningContext { input: StartupPlanningInput; checkpoint: StartupProjectCheckpoint }
export interface StartupPlanningRecord { home: string; revision: number; clock: number; job: StartupPlanningJob | null }
export type StartupPlanningResult =
  | { status: 'complete'; frames: number; through: number; result: ReturnType<typeof forecastStartupProject> }
  | { status: 'deferred'; frames: number; reason: 'admission' | 'budget' | 'expired' | 'clock' | 'conflict' | 'capacity' };
