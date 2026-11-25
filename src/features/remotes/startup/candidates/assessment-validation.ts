import { natural, object } from '../../assignment-validation';
const reasons = ['household-funding','capital-budget','construction','service-birth','labor-work','delivery','recovery-deadline','final-return'];
export function validCandidateAssessment(value: unknown): boolean {
  if (!object(value) || Object.keys(value).length !== 8 || typeof value.accepted !== 'boolean') return false;
  return validMeasures(value) && validRecovery(value) && validReasons(value.rejected,value.accepted);
}
function validMeasures(value: Record<string,unknown>): boolean {
  return [value.horizon,value.requiredHouseholdCapital,value.householdShortfall,value.deliveredEnergy].every(natural)
    && Number(value.horizon) <= 10000 && Number.isSafeInteger(value.recoveryMargin);
}
function validRecovery(value: Record<string,unknown>): boolean {
  if (value.recoveryAt === null) return value.accepted === false;
  return natural(value.recoveryAt) && value.recoveryAt <= Number(value.horizon);
}
function validReasons(value: unknown, accepted: boolean): boolean {
  if (!Array.isArray(value) || value.length > 8 || new Set(value).size !== value.length) return false;
  return value.every(reason => reasons.includes(reason)) && accepted === (value.length === 0);
}
