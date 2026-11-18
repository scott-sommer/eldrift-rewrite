import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
/** The forecast body is explicit: missing or damaged planned capacity must not suppress a replacement. */
export function healthyRemoteActor(creep: Creep, profile: RemoteFleetProfile): boolean {
  return [...new Set(profile.body)].every(part => creep.getActiveBodyparts(part) >= profile.body.filter(value => value === part).length);
}
