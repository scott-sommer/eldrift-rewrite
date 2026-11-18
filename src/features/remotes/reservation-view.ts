import type { RoomSummary } from '../intel/model';
import type { RemoteReservation } from './assessment-model';
/** Age the observation's remaining duration; it is never a permanent owner flag. */
export function remoteReservation(summary: RoomSummary, username: string, tick: number): RemoteReservation {
  if (tick < summary.observedAt) throw new Error('Remote reservation observation is in the future');
  const value = summary.controller?.reservation;
  return { state: value ? value.username === username ? 'ours' : 'foreign' : 'none',
    username: value?.username ?? null, remainingTicks: value ? Math.max(0,value.ticksToEnd - (tick-summary.observedAt)) : 0,
    observedAt: summary.observedAt };
}
