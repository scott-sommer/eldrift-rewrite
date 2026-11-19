import { remoteFleetIdentity } from './fleet/identity';
import { remoteConstructionIdentity, remoteConstructionPrefix } from './infrastructure/worker-identity';
import { reservationIdentity, reservationPrefix } from './reservation/identity';
/** Families share physical home workforce ceilings; their feature-specific policies remain separate. */
export function remoteWorkforceIdentity(owner: string): { home: string } | undefined {
  return remoteFleetIdentity(owner) ?? remoteConstructionIdentity(owner) ?? reservationIdentity(owner);
}
export function remoteWorkforceOwner(owner: string): boolean {
  return owner.startsWith('remote-fleet:') || owner.startsWith(remoteConstructionPrefix) || owner.startsWith(reservationPrefix);
}
