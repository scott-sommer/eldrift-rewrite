import { copyPlain } from '../../../../core/plain-data';
import { startupProjectIdentity } from '../../../../capabilities/economy/startup/checkpoints/project-identity';
import { createStartupPlanningJob } from '../planning/runner';
import { planningContextKey, validPlanningContext } from '../planning/validation';
import type { StartupPlanningQuery, StartupPlanningRecord } from '../planning/model';
import type { StatePort } from '../../../../persistence/versioned-state';
import { createStartupApprovalStore } from './store';
import { assessStartupApproval, completedStartupApproval, validStartupApproval } from './validation';
import type { StartupApproval, StartupApprovalProposal, StartupApprovalWrite } from './model';
export function createStartupApprovals(state: StatePort, home: string) {
  const store = createStartupApprovalStore(state,home), planner = createStartupPlanningJob(state,home);
  function capture(proposal: StartupApprovalProposal, expected: number): StartupApprovalWrite {
    const { query } = proposal, current = store.read(), scratch = planner.read();
    if (current.revision !== expected || query.tick < current.clock) return 'conflict';
    const job = matchingScratch(query,scratch); if (!job) return 'unavailable';
    const approval = snapshot(proposal,job);
    const assessment = assessStartupApproval(approval); if (!assessment) return 'unavailable';
    if (!assessment.accepted) return 'rejected';
    if (!validStartupApproval(approval,home,query.tick)) throw new Error('Invalid completed startup approval');
    const approvals = current.approvals.filter(entry => entry.job.room !== query.room || entry.job.source !== query.source);
    return store.save(expected,query.tick,[...approvals,approval]);
  }
  function lookup(query: StartupPlanningQuery) {
    if (!validPlanningContext(query,home,query.tick) || query.input.project.spawning.room !== home) throw new Error('Invalid startup approval query');
    const current = store.read(); if (query.tick < current.clock || query.tick > query.expiresAt) return undefined;
    return current.approvals.find(approval => approval.approvedAt <= query.tick && planningContextKey(approval.job) === planningContextKey(query)
      && approval.job.checkpoint.binding === startupProjectIdentity(query.input));
  }
  return { read: store.read,capture,lookup,result(query: StartupPlanningQuery) { const approval = lookup(query); return approval ? completedStartupApproval(approval) : undefined; },
    withdraw(expected: number, tick: number, target: { room: string; source: string; generation: number }): boolean {
      const current = store.read(), approvals = current.approvals.filter(entry => entry.job.room !== target.room || entry.job.source !== target.source || entry.job.generation !== target.generation);
      return approvals.length !== current.approvals.length && store.save(expected,tick,approvals) === 'saved';
    } };
}
function snapshot(proposal: StartupApprovalProposal, job: StartupApproval['job']): StartupApproval {
  const { quote,query,policy } = proposal;
  return copyPlain({ approvedAt: query.tick,job,quote: { status: 'complete',identity: quote.identity,plan: quote.plan,legs: quote.legs,operations: quote.operations },rooms: [...proposal.rooms].sort(),policy: { minimumRecoveryMargin: policy.minimumRecoveryMargin,minimumDeliveredEnergy: policy.minimumDeliveredEnergy,maximumRecoveryTicks: policy.maximumRecoveryTicks,maximumHouseholdCapital: policy.maximumHouseholdCapital } });
}

function matchingScratch(query: StartupPlanningQuery, scratch: StartupPlanningRecord) {
  if (query.tick > query.expiresAt || query.tick < scratch.clock || !scratch.job) return undefined;
  return planningContextKey(query) === planningContextKey(scratch.job) && startupProjectIdentity(query.input) === scratch.job.checkpoint.binding ? scratch.job : undefined;
}
