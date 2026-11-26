import { createStartupApprovals } from '../../../../features/remotes/startup/approvals/catalog';
import { createStartupForecastAdmission } from '../../../../features/remotes/startup/candidates/birth-admission';
import { fleetServicePlan } from '../../fleet/service-policy';
import { approvedEconomicContext, matchingEconomicApproval } from './context';
import { prepareEconomicCohort } from './prepare';
import type { SpawnRequest } from '../../../../capabilities/spawning/request';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { RemoteFleetProfile } from '../../../../features/remotes/fleet/model';
import type { RemoteFleetBirthPolicy, RemoteStartupProbe, StartupStructures } from '../model';
type StartupGuard = () => boolean;
/** Configured adapter composition; facts, geometry, forecast, publication and payment keep their existing owners. */
export function createNativeEconomicStartup(state: StatePort, structures: StartupStructures, trace: RemoteStartupProbe = () => {}): RemoteFleetBirthPolicy {
  function current(profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>) {
    if (config.remoteStartupPolicy !== 'economic') return undefined;
    const context = approvedEconomicContext(state,profile,config);
    if (!context || context.binding !== context.query.binding || Game.time > context.query.expiresAt) return null;
    return placement(fleetServicePlan(profile,context.quote.plan));
  }
  function prepare(profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>, guard: StartupGuard) {
    if (config.remoteStartupPolicy !== 'economic') return undefined;
    return prepareEconomicCohort(state,structures,profile,config,guard,trace) ? current(profile,config) : null;
  }
  function cohort(profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>) {
    if (config.remoteStartupPolicy !== 'economic') return undefined;
    const approval = matchingEconomicApproval(state,profile);
    return approval ? { kind: 'remote-startup' as const,generation: approval.job.generation,observedAt: approval.job.observedAt } : undefined;
  }
  function service(profile: Readonly<RemoteFleetProfile>) {
    const approval = matchingEconomicApproval(state,profile); return approval ? fleetServicePlan(profile,approval.quote.plan) : undefined;
  }
  function admit(profile: Readonly<RemoteFleetProfile>, request: Readonly<SpawnRequest>, config: Readonly<RuntimeConfig>): boolean {
    if (config.remoteStartupPolicy !== 'economic') return request.admission?.kind !== 'remote-startup';
    if (request.admission?.kind !== 'remote-startup') return false;
    const context = approvedEconomicContext(state,profile,config); if (!context) return false;
    return createStartupForecastAdmission(state,profile.home,createStartupApprovals(state,profile.home).result)(profile,request,context);
  }
  return { current,prepare,cohort,service,admit,trace };
}
function placement(plan: ReturnType<typeof fleetServicePlan>) { return plan ? { spawn: plan.spawn.id,exit: { ...plan.spawn.exit } } : null; }
