import { copyPlain } from '../../../core/plain-data';
import { startupTravelLegs } from '../../../features/remotes/startup/travel-plan';
import type { StartupTravelPlan } from '../../../features/remotes/startup/travel-model';
import type { RemoteFleetProfile } from '../../../features/remotes/fleet/model';
/** Selection supplies geometry, never lease/safety authority; no invalid-plan fallback. */
export function fleetServicePlan(profile: RemoteFleetProfile, selected: StartupTravelPlan | null | undefined) {
  if (selected === null || selected === undefined) return selected;
  if (!matchesProfile(profile,selected)) return null;
  try { startupTravelLegs(selected); return copyPlain(selected); } catch { return null; }
}
function matchesProfile(profile: RemoteFleetProfile, plan: StartupTravelPlan): boolean {
  return plan.home === profile.home && plan.room === profile.room && plan.source === profile.source && JSON.stringify(plan[profile.kind]) === JSON.stringify(profile.body);
}

export function fleetServiceOptions(selected: StartupTravelPlan | null | undefined) {
  return { mining: selected ? { station: selected.station } : {},transport: selected ? { service: { station: selected.station,collection: selected.collection,deposit: selected.endpoint.deposit,endpoint: selected.endpoint.id } } : {} };
}
