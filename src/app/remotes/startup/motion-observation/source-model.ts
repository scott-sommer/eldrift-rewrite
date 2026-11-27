import type { NativeStartupFacts,StartupWorkerFacts } from '../facts-model';
import type { QuantityClaim } from '../../../../persistence/quantities/schema';
import type { Claim } from '../../../../persistence/reservations/schema';
import type { PaidUnitContext,PaidUnitObservation } from './model';
export type PaidSourceContext = Pick<PaidUnitContext,'cohort' | 'plan'>;
export interface PaidSourceObservation {
  observedAt: number; source: NativeStartupFacts['source']; station: NativeStartupFacts['station'];
  containerSpace: { usedCapacity: number; freeEnergyCapacity: number } | null;
  reservation: NativeStartupFacts['reservation']; effects: NonNullable<Source['effects']>; workers: StartupWorkerFacts[];
  quantityClaims: QuantityClaim[]; stationClaim: Claim | null;
}
export type PaidSourceResult = { status: 'ready'; observation: PaidSourceObservation } | { status: 'deferred'; reason: string };
export interface PaidMinerObservation extends PaidUnitObservation {
  stage: 'spawning' | 'idle' | 'approach' | 'station'; assigned: boolean; claim: Claim | null;
  task?: { id: string; wakeAt: number; expiresAt: number; scope: string };
}
export type PaidMinerResult = { status: 'ready'; observation: PaidMinerObservation } | { status: 'deferred'; reason: string };
