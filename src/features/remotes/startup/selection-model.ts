import type { StartupTravelResult } from './travel-model';
export type CompleteStartupTravel = Extract<StartupTravelResult,{ status: 'complete' }>;
/** A geometry selection is evidence, never an execution lease or capital reservation. */
export interface StartupGeometrySelection {
  generation: number; binding: string; selectedAt: number; expiresAt: number; quote: CompleteStartupTravel;
}
export interface StartupSelectionRecord { revision: number; clock: number; selections: StartupGeometrySelection[] }
export interface StartupSelectionProposal { generation: number; binding: string; expiresAt: number; quote: CompleteStartupTravel }
