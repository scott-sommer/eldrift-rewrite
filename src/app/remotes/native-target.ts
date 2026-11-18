import type { StatePort } from '../../persistence/versioned-state';
import { createIntelStore } from '../../features/intel/store';
import { remoteReservation } from '../../features/remotes/reservation-view';
/** Traversal may admit an ally corridor; extraction still requires a neutral/self-reserved target. */
export function nativeRemoteTarget(state: StatePort, room: string, username: string): boolean {
  const summary = createIntelStore(state).peek(room,Game.time).record.summary;
  if (!summary || summary.controller?.owner) return false;
  const reservation = remoteReservation(summary,username,Game.time);
  return reservation.state === 'none' || reservation.state === 'ours' && reservation.remainingTicks > 0;
}
