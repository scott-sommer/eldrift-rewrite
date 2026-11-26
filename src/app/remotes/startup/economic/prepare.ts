import { createStartupPlanningJob } from '../../../../features/remotes/startup/planning/runner';
import { createStartupApprovals } from '../../../../features/remotes/startup/approvals/catalog';
import { createStartupCohortMaintenance } from '../../../../features/remotes/startup/candidates/cohort-maintenance';
import { approvedEconomicContext, pendingEconomicContext } from './context';
import { missingStartupBirths } from './proposals';
import { prepareEconomicProposal } from './proposal';
import { advanceEconomicProposal } from './advance';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { RemoteFleetProfile } from '../../../../features/remotes/fleet/model';
import type { StartupStructures, RemoteStartupProbe } from '../model';
type StartupGuard = () => boolean;
export function prepareEconomicCohort(state: StatePort, structures: StartupStructures, profile: Readonly<RemoteFleetProfile>, config: Readonly<RuntimeConfig>, guard: StartupGuard, trace: RemoteStartupProbe): boolean {
  trace(profile,'prepare:enter');
  const approvals = createStartupApprovals(state,profile.home), approved = approvedEconomicContext(state,profile,config);
  if (approved) {
    const maintained = createStartupCohortMaintenance(state,profile.home,approvals.result)(approved,new Set(Object.keys(Game.creeps)));
    if (maintained.status === 'current' && !missingStartupBirths(state,profile,config)) return true;
  }
  let pending = pendingEconomicContext(state,profile,config,guard);
  if (!pending) {
    if (!missingStartupBirths(state,profile,config) || !canStartHomeJob(state,profile)) return false;
    if (!prepareEconomicProposal(state,structures,profile,config,guard,trace)) return false;
    pending = pendingEconomicContext(state,profile,config,guard);
  }
  return !!pending && advanceEconomicProposal(state,profile.home,pending,config,guard);
}
function canStartHomeJob(state: StatePort, profile: Readonly<RemoteFleetProfile>): boolean {
  const record = createStartupPlanningJob(state,profile.home).read(); if (record.clock === Game.time) return false;
  const job = record.job; if (!job || job.expiresAt < Game.time) return true;
  return createStartupApprovals(state,profile.home).read().approvals.some(approval => approval.job.observedAt === job.observedAt && approval.job.binding === job.binding && approval.job.room === job.room && approval.job.source === job.source);
}
