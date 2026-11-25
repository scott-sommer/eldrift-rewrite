import { validLaborProgress } from './labor-progress';
import type { LaborProgress } from './labor-progress';
import { readLaborProposalSnapshot } from '../../capabilities/economy/startup/household/labor/proposal-reader';
import type { LaborProposalSnapshot } from '../../capabilities/economy/startup/household/labor/proposal';
import type { TaskDefinition, TaskRecord } from '../../persistence/tasks/schema';
export interface LaborTaskPayload { proposal: LaborProposalSnapshot; progress?: LaborProgress }
/** Portable payload validation; actor behavior and live authority are supplied by composition. */
export const laborTaskDefinition: TaskDefinition = { phases: ['await-birth','approach','pickup','loaded','work','return','deposit','recover-return','recover-deposit'],validPayload(value: unknown): value is LaborTaskPayload {
  if (!value || typeof value !== 'object' || Object.keys(value).some(key => !['proposal','progress'].includes(key)) || !('proposal' in value)) return false;
  try { const proposal = readLaborProposalSnapshot(value.proposal); return !('progress' in value) || validLaborProgress(value.progress,proposal.job); } catch { return false; }
} };

export function validateStagedLaborTask(task: TaskRecord, name: string): void {
  const proposal = (task.payload as LaborTaskPayload).proposal;
  if (proposal.input.request.name !== name || task.id !== 'household-labor:'+proposal.input.request.id) throw new Error('Labor task identity mismatch');
  if (task.wakeAt !== proposal.observedAt+proposal.input.birth.activeAt || task.expiresAt !== proposal.observedAt+proposal.input.policy.horizon+1 || task.retries !== 0) throw new Error('Labor task clock mismatch');
}
