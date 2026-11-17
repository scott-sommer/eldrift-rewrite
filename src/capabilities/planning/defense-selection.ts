import type { evaluateDefenseCandidate } from './defense-candidate';
type Evaluation = ReturnType<typeof evaluateDefenseCandidate>;
export interface DefenseWeights {
  construction: number; upkeep: number; repairAccess: number; gateAccess: number; towerDeficit: number;
}
export interface EvaluatedDefense { id: string; evaluation: Evaluation }
export interface DefenseSelectionPolicy {
  weights: DefenseWeights; maximumUnreachableRepair: number; maximumBlockedGates: number;
}
/** Hard-invalid candidates never rank; equal costs use stable strategy IDs independent of input order. */
export function selectDefense(candidates: readonly EvaluatedDefense[], policy: DefenseSelectionPolicy) {
  validatePolicy(policy);
  const ids = candidates.map(candidate => candidate.id);
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Invalid defense strategy identities');
  const ranked = candidates.flatMap(candidate => rank(candidate, policy))
    .sort((a, b) => a.total - b.total || compareIds(a.id, b.id));
  return { selected: ranked[0], ranked };
}
function rank(candidate: EvaluatedDefense, policy: DefenseSelectionPolicy) {
  const result = candidate.evaluation;
  if (!result.ok) return [];
  const operations = result.operations;
  if (operations.unreachableRepair.length > policy.maximumUnreachableRepair
    || operations.blockedGates.length > policy.maximumBlockedGates) return [];
  const dimensions: DefenseWeights = {
    construction: result.validation.cost, upkeep: operations.upkeepEnergyPerTick,
    repairAccess: operations.unreachableRepair.length, gateAccess: operations.blockedGates.length,
    towerDeficit: operations.undercovered.length,
  };
  const total = (Object.keys(dimensions) as (keyof DefenseWeights)[])
    .reduce((sum, key) => sum + dimensions[key] * policy.weights[key], 0);
  if (!Number.isFinite(total)) throw new Error('Defense score overflow');
  return [{ id: candidate.id, total, dimensions }];
}
function compareIds(a: string, b: string): number { return a < b ? -1 : Number(a > b); }
function validatePolicy(policy: DefenseSelectionPolicy): void {
  if (!Object.values(policy.weights).every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid defense weights');
  for (const value of [policy.maximumUnreachableRepair, policy.maximumBlockedGates]) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid defense tolerances');
  }
}
