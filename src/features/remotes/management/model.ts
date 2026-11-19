import type { ReservationQuote } from '../reservation/model';
import type { RemoteEconomicPolicy, RemoteAssessment, RemoteAssessmentRequest } from '../assessment-model';
import type { RemotePortfolioPolicy, RemoteRoomOffer, RemoteQuote } from '../portfolio-model';
import type { IntelTraversalPolicy } from '../../intel/traversal-model';
import type { RoomSummary } from '../../intel/model';
export interface RemoteRoomCandidate { room: string; commitment: RemoteRoomOffer['commitment']; reservation?: ReservationQuote | null }
export interface RemoteManagementPolicy {
  candidates: RemoteRoomCandidate[];
  traversal: IntelTraversalPolicy; economics: RemoteEconomicPolicy;
  portfolio: Omit<RemotePortfolioPolicy,'home' | 'tick'>;
  infrastructure: { roads: boolean; containers: boolean } | null; reserve: boolean;
  leaseLifetime: number; scanLifetime: number; reassessInterval: number;
}
export interface RemoteManagementRequest { home: string; tick: number; policy: RemoteManagementPolicy }
export interface RemoteScanReport { room: string; source: string; status: 'assessed' | 'rejected' | 'deferred'; reason: string }
export interface RemoteManagementRecord {
  home: string; revision: number; clock: number; identity: string; startedAt: number;
  roomIndex: number; sourceIndex: number; offers: RemoteRoomOffer[]; reports: RemoteScanReport[];
  scannedAt: number | null; committedAt: number | null; managed: { room: string; generation: number }[];
}
export interface RemoteManagementPorts {
  summary(room: string): RoomSummary | undefined;
  assess(request: RemoteAssessmentRequest, guard: () => boolean): RemoteAssessment;
  current(quote: RemoteQuote, guard: () => boolean): boolean;
  currentReservation?(quote: ReservationQuote, guard: () => boolean): boolean;
}
export interface RemoteScanBudget { rooms: number; sources: number }
