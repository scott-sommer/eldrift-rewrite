import type { BodyPart } from '../spawning/body';
import type { RemoteServiceTiming } from './remote-model';
export interface ReservationEconomicsInput {
  body: readonly BodyPart[]; lifetime: number; outboundTicks: number; returnTicks: number; replacementMargin: number;
  reservePerClaim: number; decayPerTick: number; maximumReservation: number; minimumBufferTicks: number;
}
export interface ReservationEconomics {
  status: 'evaluated'; claims: number; cost: number; spawnTicks: number; timing: RemoteServiceTiming;
  netReservePerTick: number; usefulBufferTicks: number; requiredBufferTicks: number; recoveryTicks: number;
  energyPerTick: number; spawnLoad: number;
}
export type ReservationEconomicsResult = ReservationEconomics | { status: 'infeasible'; reason: 'no-claim' | 'immobile' | 'service' | 'buffer' };
