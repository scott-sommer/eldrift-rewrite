import { createPipelineRevisionGate } from './pipeline-revision-gate';
import { createStartupApprovals } from '../../src/features/remotes/startup/approvals/catalog';
import { decodeStartupPlanningInput } from '../../src/features/remotes/startup/planning/input';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { ConfiguredPipelineMemory } from './pipeline-configured';
export interface SharedHomeApproval {
  source: string; observedAt: number; approvedAt: number; cutoff: number; homeEnergy: number;
  births: { request: string; owner: string; cost: number; startAt: number; activeAt: number }[];
}
const changed = createPipelineRevisionGate('remoteStartupApprovals/W0N1','remotes',1);
/** Passive summaries of actual retained approvals; no selection, publication or payment. */
export function observeSharedHome(state: StatePort, memory: ConfiguredPipelineMemory): void {
  if (!changed(state)) return;
  const approvals = createStartupApprovals(state,'W0N1'), rows = memory.pipelineSharedApprovals ??= [];
  for (const approval of approvals.read().approvals) {
    const job = approval.job;
    if (rows.some(row => row.source === job.source && row.observedAt === job.observedAt) || rows.length >= 16) continue;
    const input = decodeStartupPlanningInput(job.input), query = { ...job,input,tick: Game.time }, result = approvals.result(query);
    if (!result) throw new Error('Missing shared-home retained result');
    rows.push({ source: job.source,observedAt: job.observedAt,approvedAt: approval.approvedAt,cutoff: job.observedAt+input.project.spawning.cash.horizon,
      homeEnergy: input.project.spawning.cash.homeEnergy,births: result.spawning.births.map(birth => ({ ...birth,owner: input.project.spawning.requests.find(request => request.id === birth.request)!.owner,startAt: birth.startAt+job.observedAt,activeAt: birth.activeAt+job.observedAt })) });
    (memory.pipelineServicePlans ??= {})[job.source] = { generation: job.generation,plan: approval.quote.plan };
  }
}
