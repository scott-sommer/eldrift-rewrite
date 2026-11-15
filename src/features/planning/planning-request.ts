import { planningPolicyIdentity } from './planning-policy-identity';
import type { TransformIndex } from '../../core/geometry/transforms';
import type { AssessmentInput, PlanningConstraint } from '../../capabilities/planning/assessment-model';
import { preservationLocks } from '../../capabilities/planning/preservation';
import type { RuntimeConfig } from '../../config/model';
import { copyPlain } from '../../persistence/plain-data';
import type { EnumerationOptions } from './candidate-enumeration';
import type { PlanState } from './plan-model';
export interface PlanningRequestPolicy {
  strategy: RuntimeConfig['layoutStrategy'];
  preserveExisting: boolean;
  valuableTypes: readonly string[];
  constrainedAnchorLimit: number;
  refreshRevision?: number;
}
/** Prepare detached policy inputs; eligibility and when to start remain caller responsibilities. */
export function preparePlanningRequest(observed: AssessmentInput, plan: PlanState, policy: PlanningRequestPolicy) {
  validatePolicy(policy);
  const observation = copyPlain(observed);
  const controller = observation.objects.find(item => item.kind === 'controller');
  if (!controller) return { ok: false as const, reason: 'missing-controller' as const };
  observation.objects = [...observation.objects].sort(byId);
  observation.infrastructure = [...observation.infrastructure].sort(byId);
  observation.constraints = requestConstraints(observation, plan, policy);
  const owned = observation.infrastructure.filter(item => item.owned);
  const storage = owned.find(item => item.type === 'storage')?.position;
  const previous = previousCandidate(plan);
  const options: EnumerationOptions = {};
  if (policy.strategy === 'auto' || policy.strategy === 'standard') options.standard = {
    structures: owned.map(item => ({ type: item.type, position: item.position })),
    ...(storage ? { storage } : {}), ...(previous && plan.strategy === 'standard' ? { previous } : {}),
  };
  if (policy.strategy === 'auto' || policy.strategy === 'constrained') options.constrained = {
    controller: controller.position, limit: policy.constrainedAnchorLimit,
    preferred: [...(previous ? [previous.anchor] : []), ...(storage ? [storage] : [])],
  };
  if (policy.strategy === 'auto' || policy.strategy === 'stamps') options.stamps = {
    controller: controller.position, limit: policy.constrainedAnchorLimit,
    preferred: [...(previous ? [previous.anchor] : []), ...(storage ? [storage] : [])],
  };
  const operatorEntries = copyPlain(plan.entries.filter(entry => entry.source === 'operator'))
    .sort((a, b) => (a.type + ':' + a.x + ':' + a.y).localeCompare(b.type + ':' + b.x + ':' + b.y));
  const policyIdentity = planningPolicyIdentity(policy, operatorEntries);
  return { ok: true as const, observation, options: copyPlain(options), operatorEntries, policyIdentity };
}
function requestConstraints(observation: AssessmentInput, plan: PlanState, policy: PlanningRequestPolicy): PlanningConstraint[] {
  const automatic = policy.preserveExisting
    ? preservationLocks(observation.infrastructure, new Set(policy.valuableTypes)) : [];
  const operator = plan.entries.filter(entry => entry.source === 'operator').map(entry => ({
    id: 'operator:' + entry.type + ':' + entry.x + ':' + entry.y, kind: 'locked' as const,
    type: entry.type, position: { x: entry.x, y: entry.y },
  }));
  const constraints = [...observation.constraints, ...automatic, ...operator].sort(byId);
  if (new Set(constraints.map(item => item.id)).size !== constraints.length) throw new Error('Conflicting planning constraint IDs');
  return constraints;
}
function byId(a: { id: string }, b: { id: string }): number { return a.id.localeCompare(b.id); }

function previousCandidate(plan: PlanState) {
  if (!plan.provenance) return undefined;
  const { anchor, transform } = plan.provenance;
  if (!Number.isSafeInteger(transform) || transform < 0 || transform > 7) throw new Error('Invalid previous transform');
  return { anchor, transform: transform as TransformIndex };
}

function validatePolicy(policy: PlanningRequestPolicy): void {
  if (policy.refreshRevision !== undefined && (!Number.isSafeInteger(policy.refreshRevision) || policy.refreshRevision < 0)) {
    throw new Error('Invalid planning refresh revision');
  }
  if (!['auto', 'standard', 'constrained', 'stamps'].includes(policy.strategy)) throw new Error('Invalid planning strategy');
  if (!Number.isSafeInteger(policy.constrainedAnchorLimit) || policy.constrainedAnchorLimit < 1
    || policy.constrainedAnchorLimit > 2500) throw new Error('Invalid anchor limit');
}
