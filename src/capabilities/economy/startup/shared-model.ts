import type { BodyPart } from '../../spawning/body';
export interface StartupPaidWorker {
  request: string; owner: string; body: BodyPart[]; startAt: number; activeAt: number; expiresAt: number; retireAt: number; capacity: number;
}
export interface StartupPaidCohort {
  home: string; room: string; source: string; generation: number; observedAt: number; approvedAt: number; endpoint: string;
  sinkCapacity: number; workers: StartupPaidWorker[];
}
/** Already-spent births are excluded from new funding; future income is never credited. */
export interface StartupSharedCommitments {
  home: string; room: string; source: string; endpoint: string; observedAt: number; horizon: number; freeCapacity: number; cohorts: StartupPaidCohort[];
}
