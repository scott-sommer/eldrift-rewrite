import { expect, test } from 'vitest';
import { selectDefense } from '../../src/capabilities/planning/defense-selection';
const policy = { weights: { construction: 1, upkeep: 100, repairAccess: 10, gateAccess: 10, towerDeficit: 5 },
  maximumUnreachableRepair: 0, maximumBlockedGates: 0 };
function candidate(id: string, cost: number, uncovered = 0) {
  return { id, evaluation: { ok: true as const,
    validation: { ok: true as const, cost, barrierTiles: cost, protectedAssets: 1 },
    operations: { upkeepEnergyPerTick: 0.03, unreachableRepair: [], blockedGates: [], coverage: [],
      undercovered: Array.from({ length: uncovered }, () => ({ x: 25, y: 25 })) } } };
}
test('selection accounts for operational penalties and deterministic ties independent of input order', () => {
  const cheap = candidate('cheap', 1, 3), covered = candidate('covered', 10);
  expect(selectDefense([cheap, covered], policy).selected?.id).toBe('covered');
  const tied = [candidate('z', 10), candidate('a', 10)];
  expect(selectDefense(tied, policy)).toEqual(selectDefense([...tied].reverse(), policy));
  expect(selectDefense(tied, policy).selected?.id).toBe('a');
});
test('hard-invalid or inaccessible candidates cannot win on price', () => {
  const blocked = candidate('blocked', 0);
  const changed = { ...blocked, evaluation: { ...blocked.evaluation,
    operations: { ...blocked.evaluation.operations, blockedGates: [{ x: 25, y: 25 }] } } };
  const invalid = { id: 'invalid', evaluation: { ok: false as const, phase: 'placement' as const, details: ['conflict'] } };
  expect(selectDefense([changed, invalid], policy).selected).toBeUndefined();
  expect(selectDefense([changed], { ...policy, maximumBlockedGates: 1 }).selected?.dimensions.gateAccess).toBe(1);
});
test('invalid policies and duplicate strategy identities fail explicitly', () => {
  expect(() => selectDefense([], { ...policy, maximumBlockedGates: -1 })).toThrow('tolerances');
  expect(() => selectDefense([], { ...policy, weights: { ...policy.weights, upkeep: NaN } })).toThrow('weights');
  expect(() => selectDefense([candidate('same', 1), candidate('same', 2)], policy)).toThrow('identities');
});
