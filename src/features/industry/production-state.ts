import type { StateSchema } from '../../persistence/versioned-state';
import type { ProductionStep } from '../../capabilities/industry/production/model';
export interface ProductionState { context: string; step: ProductionStep | null }
function identity(value: unknown): boolean { return typeof value === 'string' && value.length > 0 && value.length <= 20; }
function reagents(value: unknown): boolean { return Array.isArray(value) && value.length === 2 && value.every(identity) && value[0] !== value[1]; }
function target(value: unknown): boolean { return Number.isSafeInteger(value) && Number(value) > 0 && Number(value) <= 100000000; }
export function validProductionStep(value: unknown): value is ProductionStep {
  if (!value || typeof value !== 'object') return false;
  const step = value as ProductionStep;
  if (!identity(step.root) || !identity(step.product)) return false;
  return reagents(step.reagents) && target(step.target);
}
export const productionSchema: StateSchema<ProductionState> = {
  owner: 'industry',version: 1,initial: () => ({ context: '',step: null }),migrations: {},
  valid(value: unknown): value is ProductionState {
    if (!value || typeof value !== 'object' || !('context' in value) || !('step' in value)) return false;
    return typeof value.context === 'string' && value.context.length <= 16000 && (value.step === null || validProductionStep(value.step));
  },
};
