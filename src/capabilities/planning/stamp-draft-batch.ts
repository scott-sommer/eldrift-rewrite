import { composeStamps } from './stamp-composition';
import type { StampCompositionInput, StampCompositionCheckpoint } from './stamp-composition';
import { attachInfrastructure } from './attach-infrastructure';
import { finishDraftBatch } from './finish-draft-batch';
import type { FinishDraftInput } from './finish-draft';
import type { RoadCheckpoint } from './road-checkpoint';
export interface StampDraftInput extends Omit<FinishDraftInput, 'entries' | 'anchors'> {
  composition: Pick<StampCompositionInput, 'stamps' | 'anchors' | 'entries' | 'corridors' | 'claimed' | 'maximumTotalAttempts'>;
}
export interface StampDraftCheckpoint { version: 1; composition: StampCompositionCheckpoint; roads?: RoadCheckpoint }
/** Composition, resource attachment and shared final road/access validation remain separate phases. */
export function stampDraftBatch(
  input: StampDraftInput, revision: string, previous: StampDraftCheckpoint | undefined,
  maximumAttempts: number, maximumSearches: number, guard: () => boolean = () => true,
) {
  if (previous && previous.version !== 1) throw new Error('Invalid stamp draft checkpoint');
  const composed = composeStamps({ ...input.composition, revision,
    observation: input.observation, limits: input.limits, blocksMovement: input.blocksMovement },
  previous?.composition, maximumAttempts, guard);
  const checkpoint: StampDraftCheckpoint = { version: 1, composition: composed.checkpoint,
    ...(previous?.roads ? { roads: copyRoads(previous.roads) } : {}) };
  if (composed.status === 'rejected') return { ok: false as const, phase: 'composition' as const,
    reason: composed.reason ?? composed.checkpoint.lastReason ?? 'no-placement' };
  if (composed.status === 'pending') return { ok: true as const, done: false as const, checkpoint };
  const entries = composed.entries!;
  if (!entries.some(entry => entry.type === 'storage' && entry.position.x === input.storage.x && entry.position.y === input.storage.y)) {
    return { ok: false as const, phase: 'storage' as const, reason: 'anchor-mismatch' };
  }
  const attached = attachInfrastructure(entries, input.storage, input.observation, input.limits, input.assess);
  if (!attached.ok) return { ok: false as const, phase: 'infrastructure' as const, reason: JSON.stringify(attached.failure) };
  if (attached.missing.length) return { ok: false as const, phase: 'infrastructure' as const, reason: attached.missing.join(',') };
  const anchors = attached.entries.filter(entry => entry.type !== 'road').map(entry => entry.position);
  const result = finishDraftBatch({ ...input, entries: attached.entries, anchors },
    revision, previous?.roads, maximumSearches, guard);
  if (!result.ok) return result;
  checkpoint.roads = result.checkpoint;
  return { ...result, checkpoint };
}

function copyRoads(checkpoint: RoadCheckpoint): RoadCheckpoint {
  return { ...checkpoint, roads: checkpoint.roads.map(tile => ({ ...tile })),
    connections: checkpoint.connections.map(connection => ({ ...connection })) };
}
