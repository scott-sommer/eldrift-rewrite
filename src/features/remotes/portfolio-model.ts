import type { ReservationQuote } from './reservation/model';
import type { RemoteEconomics } from '../../capabilities/economy/remote-model';
import type { RemoteAssessment } from './assessment-model';
export interface RemoteQuote {
  assessment: Extract<RemoteAssessment, { status: 'assessed' }>;
}
/** Inventory is explicit: missing assessments must not turn a partial room into a complete bundle. */
export interface RemoteRoomCommitment { atomic: boolean; slots: number; energyPerTick: number; spawnLoad: number }
export interface RemoteRoomOffer {
  room: string; sourceIds: string[]; quotes: RemoteQuote[];
  commitment: RemoteRoomCommitment;
  reservation?: { quote: ReservationQuote; baseCommitment: RemoteRoomCommitment } | null;
}
export interface RemotePortfolioPolicy {
  home: string; tick: number; maximumAge: number;
  maximumSlots: number; maximumHaulers: number; maximumSpawnLoad: number; maximumUnits?: number; maximumSources?: number;
  minimumNetYield: number; completionBonus: number;
  order: 'nearest' | 'net-yield';
}
export interface SelectedRemote {
  id: string; home: string; room: string; source: string; observedAt: number;
  economics: RemoteEconomics;
}
export interface RemoteBundle {
  room: string; complete: boolean; atomic: boolean; slots: number;
  sources: SelectedRemote[]; netRate: number; spawnLoad: number; haulers: number;
  closestTravel: number; totalTravel: number; rank: number;
}
export interface RemotePortfolio {
  home: string; tick: number; bundles: RemoteBundle[];
  slots: number; haulers: number; spawnLoad: number; netRate: number;
}
