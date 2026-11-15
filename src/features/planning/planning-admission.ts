import { prepareConfiguredPlanningRequest } from './configured-planning-request';
import type { createPlanningRequestStore } from './planning-request-store';
import type { AssessmentInput } from '../../capabilities/planning/assessment-model';
import type { RuntimeConfig } from '../../config/model';
import type { PlanState } from './plan-model';
/** Bind current world/policy identity while retaining seeds from the request's original plan. */
export function admitPlanningRequest(
  store: ReturnType<typeof createPlanningRequestStore>, observation: AssessmentInput, current: PlanState,
  config: Readonly<RuntimeConfig>, valuableTypes: readonly string[], implementationRevision: string,
) {
  if (!implementationRevision) throw new Error('Missing planning implementation revision');
  const prepared = prepareConfiguredPlanningRequest(observation, current, config, valuableTypes);
  if (!prepared.ok) return { status: 'unavailable' as const, reason: prepared.reason };
  const observationIdentity = JSON.stringify(prepared.observation);
  const policyIdentity = JSON.stringify([implementationRevision, prepared.policyIdentity]);
  const identity = JSON.stringify([observationIdentity, policyIdentity]);
  const saved = store.read();
  const captured = store.capture(saved.revision, identity, current);
  if (!captured.ok) return { status: 'conflict' as const };
  const base = captured.record.request!.basePlan;
  const request = prepareConfiguredPlanningRequest(observation, base, config, valuableTypes);
  if (!request.ok) throw new Error('Captured planning request became unavailable');
  return { status: 'ready' as const, request, identity, observationIdentity, policyIdentity,
    baseRevision: base.revision, reused: captured.reused };
}
