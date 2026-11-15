import { integer } from './plan-model';
export interface PlanningReceipt {
  signature: string; planRevision: number; completedAt: number;
  diagnostics?: PlanningDiagnostics;
  outcome: 'committed' | 'no-valid-candidate' | 'invalidated-selection';
}
export interface PlanningDiagnostics {
  evaluated: number; rejected: number; lastRejection?: { id: string; reason: string };
}
function validDiagnostics(value: unknown): value is PlanningDiagnostics {
  if (!value || typeof value !== 'object') return false;
  const diagnostics = value as PlanningDiagnostics;
  if (!integer(diagnostics.evaluated, 0, 10000)
    || !integer(diagnostics.rejected, 0, diagnostics.evaluated)) return false;
  if (diagnostics.lastRejection === undefined) return true;
  const last = diagnostics.lastRejection;
  return diagnostics.rejected > 0 && !!last && typeof last === 'object'
    && nonempty(last.id) && nonempty(last.reason);
}
export function validPlanningReceipt(value: unknown): value is PlanningReceipt {
  if (!value || typeof value !== 'object') return false;
  const receipt = value as Partial<PlanningReceipt>;
  return typeof receipt.signature === 'string' && receipt.signature.length > 0
    && integer(receipt.planRevision, 0, Number.MAX_SAFE_INTEGER)
    && integer(receipt.completedAt, 0, Number.MAX_SAFE_INTEGER)
    && (receipt.diagnostics === undefined || validDiagnostics(receipt.diagnostics))
    && ['committed', 'no-valid-candidate', 'invalidated-selection'].includes(receipt.outcome!);
}

function nonempty(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
