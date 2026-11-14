import { distributorOwner, haulingOwner } from '../logistics/identity';
export interface HaulingIdentity { owner: string; home: string }
/** Same executor and holder: retain tasks, cargo and receipts across this policy-only handoff. */
export function recoverDistributor(identity: HaulingIdentity, room: string): HaulingIdentity {
  return identity.home === room && identity.owner === distributorOwner(room)
    ? { home: room, owner: haulingOwner(room) } : identity;
}
