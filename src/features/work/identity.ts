import type { WorkerMode } from './policy';
export const workerModes: readonly WorkerMode[] = ['builder', 'fortifier', 'upgrader'];
/** Unscoped workers retain the configured room mode; new demand uses explicit role ownership. */
export function workOwner(room: string, mode?: WorkerMode): string { return 'work:' + room + (mode ? ':' + mode : ''); }
export function workModeFor(owner: string, room: string, fallback: WorkerMode): WorkerMode | undefined {
  return owner === workOwner(room) ? fallback : workerModes.find(mode => owner === workOwner(room, mode));
}
export function isWorkOwner(owner: string, room: string): boolean { return workModeFor(owner, room, 'builder') !== undefined; }
