import { createNativePlanningAdmission } from './native-planning-admission';
import { createNativePlanningEvaluator } from './native-planning-evaluator';
import type { NativePlanningEvaluatorOptions } from './native-planning-evaluator';
import { createNativePlanningCommitValidator } from './native-planning-commit-validation';
import type { NativeCommitPolicy } from './native-planning-commit-validation';
import type { StatePort } from '../persistence/versioned-state';
import type { PlanningWork } from './planning-feature';
import type { LayoutCosts } from '../capabilities/planning/selection';
import { scoreDimensions } from '../capabilities/planning/selection';
import type { AssessmentInput } from '../capabilities/planning/assessment-model';
export interface NativePlanningPolicy extends Omit<NativeCommitPolicy, 'currentPlan'> {
  versions: NativePlanningEvaluatorOptions['versions']; searchRevision: string; scoreRevision: string;
  maximumPathOps: number; weights: LayoutCosts; minimumImprovement: number;
  prepareScore(observation: AssessmentInput): NativePlanningEvaluatorOptions['prepareScore'];
}
/** Called only after scheduler admission; scoring/defense policy is supplied by the composition root. */
export function createNativePlanningWork(state: StatePort, room: string, readPolicy: () => NativePlanningPolicy) {
  return (canContinue: () => boolean) => {
    if (!canContinue()) return { status: 'deferred' as const };
    const policy = readPolicy(), revision = policyRevision(policy);
    const admitted = createNativePlanningAdmission(state, policy.valuableTypes, revision)(
      room, policy.config, policy.constraints);
    if (admitted.status !== 'ready') return admitted;
    const validateCommit = createNativePlanningCommitValidator(room, () => {
      const current = readPolicy();
      return { ...current, implementationRevision: policyRevision(current), currentPlan: admitted.stores.plans.read() };
    });
    let score: ReturnType<NativePlanningPolicy['prepareScore']> | undefined;
    const step = createNativePlanningEvaluator({
      room, observation: admitted.request.observation, observationIdentity: admitted.observationIdentity,
      policyIdentity: admitted.policyIdentity, operatorEntries: admitted.request.operatorEntries,
      versions: policy.versions, searchRevision: policy.searchRevision, maximumPathOps: policy.maximumPathOps,
      maximumSearches: policy.config.planningSearches, canContinue,
      stampOptions: { anchorLimit: policy.config.planningStampAnchorLimit,
        attemptsPerStep: policy.config.planningStampAttemptsPerStep, totalAttempts: policy.config.planningStampTotalAttempts },
      prepareScore: (candidate, entries) => {
        score ??= policy.prepareScore(admitted.request.observation);
        return score(candidate, entries);
      },
    });
    const base = admitted.stores.requests.read().request!.basePlan;
    const work: PlanningWork = {
      ports: { ...admitted.stores, validateCommit }, enumeration: admitted.request.options,
      input: { observation: admitted.observationIdentity, policy: admitted.policyIdentity,
        baseRevision: admitted.baseRevision, weights: policy.weights, minimumImprovement: policy.minimumImprovement,
        ...(base.provenance ? { previousId: base.provenance.candidateId } : {}), step,
        validate: proposal => validateCommit({ ...proposal, room, revision: admitted.baseRevision + 1,
          provenance: { ...proposal.provenance, committedAt: Game.time } }),
      },
    };
    return { status: 'ready' as const, work };
  };
}
/** Operational search count may vary; search semantics, scoring and protection change the desired plan. */
function policyRevision(policy: NativePlanningPolicy): string {
  if (![policy.implementationRevision, policy.versions.standard, policy.versions.constrained,
    ...(policy.versions.stamps === undefined ? [] : [policy.versions.stamps]),
    policy.searchRevision, policy.scoreRevision].every(value => value.length > 0)) throw new Error('Missing native planning revision');
  if (!Number.isSafeInteger(policy.maximumPathOps) || policy.maximumPathOps < 1) throw new Error('Invalid native planning path budget');
  if (![...scoreDimensions.map(key => policy.weights[key]), policy.minimumImprovement,
    policy.barrierCosts.rampart, policy.barrierCosts.constructedWall]
    .every(value => Number.isFinite(value) && value >= 0)) throw new Error('Invalid native planning costs');
  return JSON.stringify([policy.implementationRevision, policy.versions.standard, policy.versions.constrained, policy.versions.stamps ?? null,
    policy.searchRevision, policy.scoreRevision, policy.maximumPathOps,
    policy.config.planningStampAnchorLimit, policy.config.planningStampTotalAttempts,
    scoreDimensions.map(key => policy.weights[key]), policy.minimumImprovement,
    [...new Set(policy.protectedTypes)].sort(), policy.barrierCosts.rampart, policy.barrierCosts.constructedWall]);
}
