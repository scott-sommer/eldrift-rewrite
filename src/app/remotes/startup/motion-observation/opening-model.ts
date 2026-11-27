import type { PaidCourierObservation } from './model';
export interface PaidCourierOpening {
  observed: PaidCourierObservation;
  continuation: { stage: Exclude<PaidCourierObservation['stage'],'pending'>; readyAt: number; requestRemaining: number | null };
  reflectedEffect?: { id: string; kind: 'withdraw' | 'transfer'; amount: number; issuedAt: number; postedAmount: number; projectedIncome: 0 };
}
export type PaidCourierOpeningResult = { status: 'ready'; opening: PaidCourierOpening } | { status: 'deferred'; reason: string };
