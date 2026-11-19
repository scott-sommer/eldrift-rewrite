import type { ReservationQuote, ReservationQuoteResult } from '../model';
export interface ReservationCandidate { room: string; checkedAt: number | null; quote: ReservationQuote | null }
export interface ReservationSelectionRecord { home: string; revision: number; clock: number; identity: string; next: number; entries: ReservationCandidate[]; published: ReservationCandidate[] }
export interface ReservationSelectionRequest { tick: number; identity: string; rooms: string[]; reads: number; refreshInterval: number; maximumAge: number }
export type ReservationQuotePort = (room: string, guard: () => boolean) => ReservationQuoteResult;
