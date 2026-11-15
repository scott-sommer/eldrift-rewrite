import { copyPlain, parsePlain } from '../../persistence/plain-data';
import type { StagedTile } from '../../capabilities/planning/template';
export interface CandidateProgress {
  signature: string; phase: 'draft' | 'score'; checkpoint?: unknown; entries?: StagedTile[];
}
interface StoredProgress extends CandidateProgress { version: number; payload?: string }
/** The lifecycle carries opaque JSON; only this owner decodes and validates its nested progress. */
export function saveCandidateProgress(progress: CandidateProgress) {
  const payload = copyPlain({
    ...(progress.checkpoint === undefined ? {} : { checkpoint: progress.checkpoint }),
    ...(progress.entries === undefined ? {} : { entries: progress.entries }),
  });
  return { version: 2 as const, signature: progress.signature, phase: progress.phase, payload: encodePayload(payload) };
}
export function restoreCandidateProgress(signature: string, saved: unknown): CandidateProgress {
  if (saved === undefined) return { signature, phase: 'draft' };
  const progress = decodeCandidateProgress(saved);
  if (progress.signature !== signature) throw new Error('Stale candidate evaluation');
  return progress;
}
/** Version1 object checkpoints upgrade on their next save; persisted semantic identities stay unchanged. */
export function decodeCandidateProgress(saved: unknown): CandidateProgress {
  const stored = copyPlain(saved) as StoredProgress;
  if (!stored || ![1, 2].includes(stored.version) || typeof stored.signature !== 'string' || !stored.signature) {
    throw new Error('Stale candidate evaluation');
  }
  if (stored.phase !== 'draft' && stored.phase !== 'score') throw new Error('Invalid evaluation phase');
  const data = stored.version === 1 ? stored : decodePayload(stored.payload);
  if (stored.phase === 'score' && !Array.isArray(data.entries)) throw new Error('Missing score placements');
  return { signature: stored.signature, phase: stored.phase,
    ...(data.checkpoint === undefined ? {} : { checkpoint: data.checkpoint }),
    ...(data.entries === undefined ? {} : { entries: data.entries }) };
}
function decodePayload(payload: unknown): Pick<CandidateProgress, 'checkpoint' | 'entries'> {
  if (typeof payload !== 'string' || payload.length > 2000000) throw new Error('Invalid evaluation payload');
  const value: unknown = parsePlain(payload);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid evaluation payload');
  return value;
}

function encodePayload(value: unknown): string {
  const payload = JSON.stringify(value);
  if (payload.length > 2000000) throw new Error('Invalid evaluation payload');
  return payload;
}
