import { integer } from './plan-model';
export interface PlanningReceipt {
  signature: string; planRevision: number; completedAt: number;
  outcome: 'committed' | 'no-valid-candidate' | 'invalidated-selection';
}
export function validPlanningReceipt(value: unknown): value is PlanningReceipt {
  if (!value || typeof value !== 'object') return false;
  const receipt = value as Partial<PlanningReceipt>;
  return typeof receipt.signature === 'string' && receipt.signature.length > 0
    && integer(receipt.planRevision, 0, Number.MAX_SAFE_INTEGER)
    && integer(receipt.completedAt, 0, Number.MAX_SAFE_INTEGER)
    && ['committed', 'no-valid-candidate', 'invalidated-selection'].includes(receipt.outcome!);
}
