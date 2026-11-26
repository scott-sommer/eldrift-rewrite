import type { StartupTravelPlan } from '../../../features/remotes/startup/travel-model';
import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
import type { SpawnRequest, SpawnPlacement } from '../../../capabilities/spawning/request';
import type { RuntimeConfig } from '../../../config/model';
import type { BodyPart } from '../../../capabilities/spawning/body';
export type RemoteBirthPermit = (owner: string, body: readonly BodyPart[], config: Readonly<RuntimeConfig>) => boolean;
export interface StartupStructures { availableEnergy(home: string, available: number): number }
export interface SourceStartupSurvey { status: 'unknown' | 'missing' | 'building' | 'ready'; source?: Source; site?: ConstructionSite }

export type StartupSurvey = (room: string,source: string) => SourceStartupSurvey;

/** Undefined permits ordinary allocation; null defers births; placement binds a selected origin. */
export type RemoteBirthSelection = SpawnPlacement | null | undefined;
export interface RemoteFleetBirthPolicy {
  /** Undefined retains ordinary geometry; null withdraws productive service. */
  service?(profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>): StartupTravelPlan | null | undefined;
  prepare?(profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>, guard: () => boolean): RemoteBirthSelection;
  /** Optional current request/economic fence; no planning, publication or spending. */
  admit?(profile: Readonly<RemoteFleetProfile>, request: Readonly<SpawnRequest>, config: Readonly<RuntimeConfig>): boolean;
  /** Read-only final admission; must not start expensive planning or publish state. */
  current(profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>): RemoteBirthSelection;
}
