import type { BodyPart } from '../../../../spawning/body';
import type { StartupScheduledBirth } from '../../spawn-model';
export interface HouseholdLaborJob {
  id: string; request: string; kind: 'build' | 'repair' | 'upgrade'; pickupAt: number;
  outboundTicks: number; workTicks: number; returnTicks: number; energy: number;
}
export interface HouseholdLaborInput { horizon: number; jobs: readonly HouseholdLaborJob[] }
export interface HouseholdLaborWorker { birth: StartupScheduledBirth; body: readonly BodyPart[] }
export interface HouseholdLaborPorts {
  worker(request: string): HouseholdLaborWorker | undefined;
  withdraw(maximum: number, job: Readonly<HouseholdLaborJob>): number;
  /** Settled energy consumption, not proposed work or delivered income. */
  consume(maximum: number, job: Readonly<HouseholdLaborJob>): number;
  deposit(maximum: number, job: Readonly<HouseholdLaborJob>): number;
  lose(energy: number, job: Readonly<HouseholdLaborJob>): void;
}
export interface HouseholdLaborState {
  id: string; phase: 'waiting' | 'working' | 'returning' | 'complete' | 'missed' | 'expired';
  cargo: number; picked: number; spent: number; returned: number; lost: number;
  workAt: number | null; stopAt: number | null; returnAt: number | null; expiresAt: number | null; doneAt: number | null; rate: number;
}
