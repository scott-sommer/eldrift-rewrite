import type { RepairProfile } from '../../../../capabilities/mining/repair-effect';
import type { RemoteAssignmentState } from '../../../../features/remotes/assignment-model';
import type { Reservations } from '../../../../persistence/reservations/schema';
import type { EnergyEcology } from '../../../../capabilities/resources/energy-inventory/model';
import type { RemoteTransportDemand } from '../../../../features/remotes/transport-authority';
import type { StartupPaidCohort,StartupPaidWorker } from '../../../../capabilities/economy/startup/shared-model';
import type { StartupTravelPlan } from '../../../../features/remotes/startup/travel-model';
import type { PaidSourceObservation,PaidMinerObservation } from '../motion-observation/source-model';
import type { PaidCourierOpening } from '../motion-observation/opening-model';
import type { PaidCourierActiveRoute } from '../../../../features/remotes/startup/routes/model';
import type { NativeStartupFacts,StartupWorkerFacts } from '../facts-model';
import type { QuantityClaimPartition } from '../../../../persistence/quantities/partition';
export interface PaidHomeGroup { cohort: StartupPaidCohort; plan: StartupTravelPlan }
export interface PaidHomeObservationRequest { home: string; endpoint: string; groups: readonly PaidHomeGroup[]; requireActivated: boolean }
export interface PaidHomeSourceObservation {
  cohort: StartupPaidCohort; plan: StartupTravelPlan; demand: RemoteTransportDemand;
  observation: Omit<PaidSourceObservation,'quantityClaims'>; claimIds: string[];
  miners: { paid: StartupPaidWorker; observation: PaidMinerObservation }[];
  couriers: { paid: StartupPaidWorker; opening: PaidCourierOpening; route: PaidCourierActiveRoute | null }[];
}
export interface PaidHomeInventory { capacityPool: string; id: string; room: string; energy: number; capacity: number; usedCapacity: number; freeEnergyCapacity: number; active: boolean }
export interface PaidHomeBody { name: string; unit: string; repair?: RepairProfile; inventory: PaidHomeInventory }
export interface PaidHomeControl { assignments: RemoteAssignmentState | null; reservations: Reservations | null }
export interface PaidHomeObservation {
  observedAt: number; home: string; endpoint: NativeStartupFacts['endpoint']; stock: NativeStartupFacts['stock']; spawns: NativeStartupFacts['spawns'];
  control: PaidHomeControl; ecology: EnergyEcology; inventories: PaidHomeInventory[]; bodies: PaidHomeBody[]; workers: StartupWorkerFacts[]; sources: PaidHomeSourceObservation[]; claims: QuantityClaimPartition;
}
export type PaidHomeObservationResult = { status: 'ready'; observation: PaidHomeObservation } | { status: 'deferred'; reason: string };
