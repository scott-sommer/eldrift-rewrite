import { framedIdentity } from '../../../../core/framed-identity';
import { fleetServicePlan } from '../../fleet/service-policy';
import type { RemoteFleetProfile } from '../../../../features/remotes/fleet/model';
import type { StartupTravelPlan } from '../../../../features/remotes/startup/travel-model';
import type { EconomicApprovalReader } from './context';
/** Cache geometry for already-paid service only. Every financial read still invokes the current approval reader. */
export function createEconomicApprovalViews(read: EconomicApprovalReader) {
  const plans = new Map<string,{ generation: number; plan: StartupTravelPlan }>();
  function current(profile: Readonly<RemoteFleetProfile>) {
    const approval = read(profile), plan = approval && fleetServicePlan(profile,approval.quote.plan);
    if (!approval || approval.job.generation !== profile.generation || !plan) return undefined;
    const id = sourceKey(profile);
    if (!plans.has(id) && plans.size >= 2048) plans.delete(plans.keys().next().value!);
    plans.set(id,{ generation: profile.generation,plan }); return approval;
  }
  function service(profile: Readonly<RemoteFleetProfile>) {
    const saved = plans.get(sourceKey(profile));
    if (saved?.generation === profile.generation) return fleetServicePlan(profile,saved.plan);
    const approval = current(profile); return approval ? fleetServicePlan(profile,approval.quote.plan) : undefined;
  }
  return { current,service };
}
function sourceKey(profile: Readonly<RemoteFleetProfile>): string { return framedIdentity([profile.home,profile.room,profile.source]); }
