import type { DemandPlan } from '../../population/apply-demand';
import type { RemoteFleetProfile } from './model';
/** Replace before service retirement, leaving the configured margin for queue/scheduling delay. */
export function remoteFleetDemand(profile: RemoteFleetProfile, desired: number, requestLifetime: number): DemandPlan {
  return { owner: profile.owner,room: profile.home,desired,body: profile.body,replacementParts: profile.body.length,
    travelTicks: profile.travelTicks,marginTicks: profile.retireTicks+profile.marginTicks,
    priority: profile.priority,requestLifetime };
}
