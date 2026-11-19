import { remoteFleetIdentity } from '../../../features/remotes/fleet/identity';
import { reservationIdentity } from '../../../features/remotes/reservation/identity';
import { remoteConstructionIdentity } from '../../../features/remotes/infrastructure/worker-identity';
export function remotePopulationIdentity(owner: string): { home: string; room: string } | undefined {
  return remoteFleetIdentity(owner) ?? reservationIdentity(owner) ?? remoteConstructionIdentity(owner);
}
