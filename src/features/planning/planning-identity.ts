import { assessmentFingerprint } from '../../capabilities/planning/snapshot';
import type { AssessmentInput } from '../../capabilities/planning/assessment-model';
export function identifyPlanningRequest(request: { observation: AssessmentInput; policyIdentity: string }, implementationRevision: string, room: string) {
  if (!implementationRevision) throw new Error('Missing planning implementation revision');
  const observationIdentity = assessmentFingerprint(room, request.observation);
  const policyIdentity = JSON.stringify([implementationRevision, request.policyIdentity]);
  return { observationIdentity, policyIdentity, identity: JSON.stringify([observationIdentity, policyIdentity]) };
}
