import { copyPlain } from '../../persistence/plain-data';
import { createDefenseCoordinator } from './defense-coordinator';
import type { DefenseCoordinatorCheckpoint } from './defense-coordinator-progress';
import type { CandidateDefense } from './candidate-defense';
import type { PlanningCandidate } from './planning-job-model';
import type { StagedTile } from '../../capabilities/planning/template';
type CoordinatorInputs = Parameters<typeof createDefenseCoordinator>;
export interface CandidateDefenseSetup {
  strategies: CoordinatorInputs[0]; input: CoordinatorInputs[1]; policy: CoordinatorInputs[2];
}
interface SavedDefense { version: 1; request: string; coordinator: DefenseCoordinatorCheckpoint }
/** Retain one request's accelerator; serialized geometry is authoritative after cache loss or rollback. */
export function createCoordinatedCandidateDefense(
  revision: string,
  prepare: (candidate: PlanningCandidate, entries: readonly StagedTile[]) => CandidateDefenseSetup,
  budget: { augmentations: number; scans: number },
): CandidateDefense {
  if (!revision) throw new Error('Missing coordinated defense revision');
  budget = copyPlain(budget);
  let cached: { request: string; expected: string; coordinator: ReturnType<typeof createDefenseCoordinator> } | undefined;
  return { revision, advance(candidate, entries, checkpoint, guard) {
    if (!guard()) return { status: 'pending', checkpoint };
    const request = JSON.stringify(['candidate-defense-v1', revision, candidate, entries]);
    const saved = restore(request, checkpoint), expected = JSON.stringify(saved ?? null);
    if (!cached || cached.request !== request || cached.expected !== expected) {
      const setup = prepare(copyPlain(candidate), copyPlain(entries));
      cached = { request, expected, coordinator: createDefenseCoordinator(setup.strategies, setup.input, setup.policy,
        { revision, ...(saved ? { checkpoint: saved.coordinator } : {}) }) };
    }
    const result = cached.coordinator.advance(budget, guard);
    if (result.status === 'complete') {
      if (!result.selected) return { status: 'rejected', reason: 'no-valid-defense' };
      return { status: 'complete', entries: mergeBarriers(entries, result.selected.barriers) };
    }
    const next: SavedDefense = { version: 1, request, coordinator: cached.coordinator.checkpoint() };
    cached.expected = JSON.stringify(next);
    return { status: 'pending', checkpoint: next };
  } };
}
function restore(request: string, checkpoint: unknown): SavedDefense | undefined {
  if (checkpoint === null || checkpoint === undefined) return undefined;
  const saved = copyPlain(checkpoint) as SavedDefense;
  if (!saved || saved.version !== 1 || saved.request !== request || !saved.coordinator) throw new Error('Stale coordinated defense');
  return saved;
}
function mergeBarriers(entries: readonly StagedTile[], barriers: readonly StagedTile[]): StagedTile[] {
  const key = (entry: StagedTile) => JSON.stringify([entry.type, entry.position.x, entry.position.y]);
  const existing = new Set(entries.map(key));
  return copyPlain([...entries, ...barriers.filter(barrier => !existing.has(key(barrier)))]);
}
