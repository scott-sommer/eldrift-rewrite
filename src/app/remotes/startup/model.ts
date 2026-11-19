import type { RuntimeConfig } from '../../../config/model';
import type { BodyPart } from '../../../capabilities/spawning/body';
export type RemoteBirthPermit = (owner: string, body: readonly BodyPart[], config: Readonly<RuntimeConfig>) => boolean;
export interface StartupStructures { availableEnergy(home: string, available: number): number }
export interface SourceStartupSurvey { status: 'unknown' | 'missing' | 'building' | 'ready'; source?: Source; site?: ConstructionSite }

export type StartupSurvey = (room: string,source: string) => SourceStartupSurvey;
