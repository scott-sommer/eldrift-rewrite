import { restoreDefenseCoordinator } from './defense-coordinator-progress';
import type { DefenseCoordinatorCheckpoint } from './defense-coordinator-progress';
import { copyPlain } from '../../persistence/plain-data';
import type { DefenseStrategy } from './defense-strategies';
import { evaluateDefenseCandidate } from '../../capabilities/planning/defense-candidate';
import type { DefenseCandidateInput } from '../../capabilities/planning/defense-candidate';
import { selectDefense } from '../../capabilities/planning/defense-selection';
import type { DefenseSelectionPolicy, EvaluatedDefense } from '../../capabilities/planning/defense-selection';
import type { StagedTile } from '../../capabilities/planning/template';
interface CompletedDefense extends EvaluatedDefense { barriers: StagedTile[] }
/** Heap coordinator: each call advances one generator or evaluates its finished geometry. */
export function createDefenseCoordinator(
  strategies: readonly DefenseStrategy[], input: Omit<DefenseCandidateInput, 'barriers'>, policy: DefenseSelectionPolicy,
  recovery?: { revision: string; checkpoint?: DefenseCoordinatorCheckpoint },
) {
  const { blocksMovement, ...plainInput } = input;
  input = { ...copyPlain(plainInput), blocksMovement };
  policy = copyPlain(policy);
  const ids = strategies.map(strategy => strategy.id);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Invalid defense strategies');
  const ordered = [...strategies], completed: CompletedDefense[] = [], rejected: { id: string; reason: string }[] = [];
  const { identity, generated } = coordinatorProgress(ids, plainInput, policy, recovery);
  let cursor = 0;
  return { advance(budget: { augmentations: number; scans: number }, guard: () => boolean) {
    if (cursor === ordered.length) return finish(completed, rejected, policy);
    if (!guard()) return { status: 'pending' as const };
    const strategy = ordered[cursor]!;
    const retained = generated[cursor];
    if (retained) {
      if (retained.status === 'complete') completed.push({ id: strategy.id, barriers: retained.barriers,
        evaluation: evaluateDefenseCandidate({ ...input, barriers: retained.barriers }) });
      else rejected.push({ id: strategy.id, reason: retained.reason });
      cursor++;
    } else {
      const result = strategy.advance(budget, guard);
      if (result.status !== 'pending') generated.push(copyPlain({ ...result, id: strategy.id }));
    }
    return { status: 'pending' as const };
  }, checkpoint(): DefenseCoordinatorCheckpoint { return copyPlain({ version: 1, identity, generated }); } };
}
function finish(completed: readonly CompletedDefense[], rejected: readonly { id: string; reason: string }[], policy: DefenseSelectionPolicy) {
  const selection = selectDefense(completed, policy);
  const selected = completed.find(candidate => candidate.id === selection.selected?.id);
  return { status: 'complete' as const,
    ...JSON.parse(JSON.stringify({ selection, completed, rejected, ...(selected ? { selected } : {}) })) as {
      selection: ReturnType<typeof selectDefense>; completed: CompletedDefense[];
      rejected: { id: string; reason: string }[]; selected?: CompletedDefense;
    } };
}

function coordinatorProgress(ids: string[], input: unknown, policy: DefenseSelectionPolicy,
  recovery?: { revision: string; checkpoint?: DefenseCoordinatorCheckpoint }) {
  if (recovery && !recovery.revision) throw new Error('Missing defense coordinator revision');
  const identity = JSON.stringify(['defense-coordinator-v1', recovery?.revision ?? 'heap', ids, input, policy]);
  return { identity, generated: restoreDefenseCoordinator(identity, ids, recovery?.checkpoint) };
}
