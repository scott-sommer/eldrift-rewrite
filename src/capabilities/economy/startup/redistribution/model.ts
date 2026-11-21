export interface StartupRedistributionTrip {
  id: string; request: string; pickupAt: number; loadedTicks: number; returnTicks: number; energy: number;
}
export interface StartupRedistributionInput { horizon: number; trips: readonly StartupRedistributionTrip[] }
/** Authoritative modeled paid-birth facts; absence cannot authorize an unadmitted worker. */
export interface StartupRedistributionWorker { activeAt: number; expiresAt: number; capacity: number }
export interface StartupRedistributionPorts {
  worker(request: string): StartupRedistributionWorker | undefined;
  withdraw(maximum: number): number;
  deposit(maximum: number): number;
  lose(energy: number): void;
}
export interface StartupRedistributionState {
  id: string; phase: 'waiting' | 'carrying' | 'complete' | 'missed' | 'lost';
  cargo: number; picked: number; delivered: number; lost: number;
  arrivalAt: number | null; expiresAt: number | null; doneAt: number | null;
}
export interface StartupRedistributionCheckpoint {
  format: 1; binding: string; through: number; trips: StartupRedistributionState[]; busy: { request: string; until: number }[];
}
