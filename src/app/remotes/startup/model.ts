import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
import type { SpawnPlacement } from '../../../capabilities/spawning/request';
import type { RuntimeConfig } from '../../../config/model';
import type { BodyPart } from '../../../capabilities/spawning/body';
export type RemoteBirthPermit = (owner: string, body: readonly BodyPart[], config: Readonly<RuntimeConfig>) => boolean;
export interface StartupStructures { availableEnergy(home: string, available: number): number }
export interface SourceStartupSurvey { status: 'unknown' | 'missing' | 'building' | 'ready'; source?: Source; site?: ConstructionSite }

export type StartupSurvey = (room: string,source: string) => SourceStartupSurvey;

/** Undefined permits ordinary allocation; null defers births; placement binds a selected origin. */
export type RemoteBirthSelection = SpawnPlacement | null | undefined;
export interface RemoteFleetBirthPolicy {
  prepare?(profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>, guard: () => boolean): RemoteBirthSelection;
  /** Read-only final admission; must not start expensive planning or publish state. */
  current(profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>): RemoteBirthSelection;
}
