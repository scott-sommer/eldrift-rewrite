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
) {
  const { blocksMovement, ...plainInput } = input;
  input = { ...copyPlain(plainInput), blocksMovement };
  policy = copyPlain(policy);
  const ids = strategies.map(strategy => strategy.id);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Invalid defense strategies');
  const ordered = [...strategies], completed: CompletedDefense[] = [], rejected: { id: string; reason: string }[] = [];
  let cursor = 0, pending: StagedTile[] | undefined;
  return { advance(budget: { augmentations: number; scans: number }, guard: () => boolean) {
    if (cursor === ordered.length) return finish(completed, rejected, policy);
    if (!guard()) return { status: 'pending' as const };
    const strategy = ordered[cursor]!;
    if (pending) {
      const evaluation = evaluateDefenseCandidate({ ...input, barriers: pending });
      completed.push({ id: strategy.id, barriers: pending, evaluation });
      pending = undefined; cursor++;
    } else {
      const result = strategy.advance(budget, guard);
      if (result.status === 'complete') pending = JSON.parse(JSON.stringify(result.barriers)) as StagedTile[];
      if (result.status === 'rejected') { rejected.push({ id: strategy.id, reason: result.reason }); cursor++; }
    }
    return { status: 'pending' as const };
  } };
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
