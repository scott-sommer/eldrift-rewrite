import type { StateSchema } from '../../persistence/versioned-state';
import type { SpawnRequest } from '../../capabilities/spawning/request';
import { readLaborProposalSnapshot } from '../../capabilities/economy/startup/household/labor/proposal-reader';
import type { LaborProposalSnapshot } from '../../capabilities/economy/startup/household/labor/proposal';
import { materializeLaborBirth } from './labor-birth';
import { sameSpawnRequest } from '../../capabilities/spawning/placement';
export interface LaborPublication { phase: 'prepared' | 'reserved' | 'queued' | 'revoked'; proposal: LaborProposalSnapshot; request: SpawnRequest }
export interface LaborPublicationState { entry: LaborPublication | null }
/** One in-flight publication per home; the task owns execution after observed birth. */
export function laborPublicationSchema(home: string): StateSchema<LaborPublicationState> {
  return { owner: 'labor-publication',version: 1,migrations: {},initial: () => ({ entry: null }),valid(value: unknown): value is LaborPublicationState {
    if (!value || typeof value !== 'object' || Object.keys(value).length !== 1 || !('entry' in value)) return false;
    if (value.entry === null) return true;
    try { return validEntry(value.entry as LaborPublication,home); } catch { return false; }
  } };
}
function validEntry(entry: LaborPublication, home: string): boolean {
  if (!entry || Object.keys(entry).length !== 3 || !['prepared','reserved','queued','revoked'].includes(entry.phase)) return false;
  const proposal = readLaborProposalSnapshot(entry.proposal), birth = materializeLaborBirth(proposal,entry.request.readyAt,true);
  return proposal.input.request.room === home && birth.status === 'ready' && sameSpawnRequest(birth.request,entry.request);
}
