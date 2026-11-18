export interface ObservationRequest {
  id: string; owner: string; home: string; room: string; priority: number; requestedAt: number; expiresAt: number;
}
export interface ObservationFlight { request: ObservationRequest; observer: string; issuedAt: number; code: number | null }
export type ObservationOutcome = 'observed' | 'missed' | 'expired' | 'rejected' | 'exception';
export interface ObservationReceipt {
  request: ObservationRequest; observer: string | null; issuedAt: number | null;
  completedAt: number; outcome: ObservationOutcome; code: number | null;
}
export interface ObservationState {
  revision: number; homeCursor: string | null; requestCursor: string | null; requests: ObservationRequest[]; flights: ObservationFlight[]; receipts: ObservationReceipt[];
  cursors: { home: string; room: string }[];
}
export interface ObservationUnit { id: string; home: string }
