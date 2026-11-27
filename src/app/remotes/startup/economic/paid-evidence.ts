import { createStartupApprovals } from '../../../../features/remotes/startup/approvals/catalog';
import { createRemoteFleetStore } from '../../../../features/remotes/fleet/store';
import { createRemoteAssignmentStore } from '../../../../features/remotes/assignment-store';
import { decodeStartupPlanningInput } from '../../../../features/remotes/startup/planning/input';
import { observeStartupBirths } from '../../../../adapters/screeps/startup-birth-observation';
import { createNativeStartupExecutionBinding } from '../execution-binding';
import { startupEconomicPolicy } from './policy';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { RuntimeConfig } from '../../../../config/model';
import type { PaidCohortReader } from '../../../../features/remotes/startup/paid-cohorts';
/** Full historical finance plus fresh config, lease, profile and actual payment observations. */
export function createPaidCohortEvidence(state: StatePort, home: string, config: Readonly<RuntimeConfig>): PaidCohortReader {
  const approvals = createStartupApprovals(state,home).read().approvals, actors = createRemoteFleetStore(state,home).read().actors;
  const assignments = createRemoteAssignmentStore(state), binding = createNativeStartupExecutionBinding(state);
  return (room,source) => {
    const approval = approvals.find(entry => entry.job.room === room && entry.job.source === source); if (!approval) return undefined;
    const profiles = actors.filter(profile => profile.room === room && profile.source === source), lease = assignments.owner(room,Game.time);
    const current = !!lease && lease.home === home && lease.generation === approval.job.generation && lease.plan.sources.includes(source)
      && binding(approval.quote.plan,approval.rooms,config,startupEconomicPolicy(config)) === approval.job.binding;
    const input = decodeStartupPlanningInput(approval.job.input);
    return { approval,profiles,current,births: observeStartupBirths(input.project.spawning.requests) };
  };
}
