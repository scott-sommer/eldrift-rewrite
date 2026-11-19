import type { IntelTraversalPolicy } from '../../intel/traversal-model';
import type { RemoteControllerTarget } from '../assignment-model';
import type { selectBufferedReservation } from './body-policy';
export interface ReservationQuoteRequest {
  home: string; room: string; tick: number; bodyBudget: number; minimumBufferTicks: number; replacementMargin: number; traversal: IntelTraversalPolicy;
}
export type BufferedReservation = NonNullable<ReturnType<typeof selectBufferedReservation>>;
export type ReservationQuote = BufferedReservation & { status: 'quoted'; home: string; room: string; controller: RemoteControllerTarget; observedAt: number;
  travel: { outboundTicks: number; returnTicks: number; rooms: string[]; operations: number; profile: 'balanced-claim-move' } };
export type ReservationQuoteResult = ReservationQuote | { status: 'deferred' | 'infeasible'; reason: string };
