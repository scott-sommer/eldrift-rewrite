import { framedIdentity } from '../../../../core/framed-identity';
import { fleetServicePlan } from '../../fleet/service-policy';
import type { RemoteFleetProfile } from '../../../../features/remotes/fleet/model';
import type { StartupTravelPlan } from '../../../../features/remotes/startup/travel-model';
import type { EconomicApprovalReader } from './context';
/** Cache geometry for already-paid service only. Every financial read still invokes the current approval reader. */
export function createEconomicApprovalViews(read: EconomicApprovalReader, geometry?: (profile: Readonly<RemoteFleetProfile>) => StartupTravelPlan | undefined) {
  const plans = new Map<string,{ generation: number; plan: StartupTravelPlan }>();
  function remember(profile: Readonly<RemoteFleetProfile>, selected: StartupTravelPlan | undefined) {
    const plan = fleetServicePlan(profile,selected); if (!plan) return plan;
    const id = sourceKey(profile);
    if (!plans.has(id) && plans.size >= 2048) plans.delete(plans.keys().next().value!);
    plans.set(id,{ generation: profile.generation,plan }); return plan;
  }
  function current(profile: Readonly<RemoteFleetProfile>) {
    const approval = read(profile);
    if (!approval || approval.job.generation !== profile.generation || !remember(profile,approval.quote.plan)) return undefined;
    return approval;
  }
  function service(profile: Readonly<RemoteFleetProfile>) {
    const saved = plans.get(sourceKey(profile));
    if (saved?.generation === profile.generation) return fleetServicePlan(profile,saved.plan);
    if (geometry) return fleetServicePlan(profile,remember(profile,geometry(profile)));
    const approval = current(profile); return approval ? fleetServicePlan(profile,approval.quote.plan) : undefined;
  }
  return { current,service };
}
function sourceKey(profile: Readonly<RemoteFleetProfile>): string { return framedIdentity([profile.home,profile.room,profile.source]); }
