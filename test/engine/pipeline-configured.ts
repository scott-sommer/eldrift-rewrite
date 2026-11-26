import { createStartupApprovals } from '../../src/features/remotes/startup/approvals/catalog';
import { createStartupPlanningJob } from '../../src/features/remotes/startup/planning/runner';
import { decodeStartupPlanningInput } from '../../src/features/remotes/startup/planning/input';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import type { StatePort } from '../../src/persistence/versioned-state';
import type { CalibrationMemory } from './pipeline-cohort-calibration';
import type { PipelineServiceMemory } from './pipeline-service-policy';
export interface ConfiguredPipelineMemory extends CalibrationMemory, PipelineServiceMemory { pipelineConfiguredMode?: boolean; pipelineConfiguredPlanning?: { tick: number; through: number; observedAt: number }[]; pipelineConfiguredApproval?: { approvedAt: number; observedAt: number } }
/** Test-only configuration and passive evidence collection; no proposal, queue, selection or approval publication. */
export function observeConfiguredPipeline(state: StatePort): void {
  const memory = Memory as ConfiguredPipelineMemory; if (!memory.pipelineConfiguredMode) return;
  if (Game.time === 1) {
    const record = openState(state,'operator/config',operatorSchema);
    record.empire = { ...record.empire as object,remoteStartupPolicy: 'economic',remoteStartupHorizon: 767,remoteStartupFrames: 32,remoteStartupPlanningLead: 30 };
    saveState(state,'operator/config',operatorSchema,record);
  }
  const job = createStartupPlanningJob(state,'W0N1').read().job;
  if (job) {
    const rows = memory.pipelineConfiguredPlanning ??= [];
    if (rows.at(-1)?.through !== job.checkpoint.tick) rows.push({ tick: Game.time,through: job.checkpoint.tick,observedAt: job.observedAt });
  }
  if (memory.pipelineCalibration) return;
  const approvals = createStartupApprovals(state,'W0N1'), approval = approvals.read().approvals[0]; if (!approval) return;
  const { room,source,generation,binding,observedAt,expiresAt } = approval.job, input = decodeStartupPlanningInput(approval.job.input);
  const query = { room,source,generation,binding,observedAt,expiresAt,tick: Game.time,input }, result = approvals.result(query); if (!result) throw new Error('Missing retained configured result');
  memory.pipelineConfiguredApproval = { approvedAt: approval.approvedAt,observedAt };
  memory.pipelineCalibration = { quote: { ...approval.quote,rooms: approval.rooms,observedAt },input: approval.job.input,result,horizon: input.project.spawning.cash.horizon,frames: [],events: [] };
  memory.pipelineServicePlans = { [source]: { generation,plan: approval.quote.plan } };
}
