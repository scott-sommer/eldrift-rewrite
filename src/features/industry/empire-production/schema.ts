import type { StateSchema } from '../../../persistence/versioned-state';
import type { EmpireProductionState, EmpireProductionWindow } from './model';
import { validProductionStep } from '../production-state';
function integer(value: unknown,minimum: number): boolean { return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= 1000000; }
function identity(window: EmpireProductionWindow): boolean {
  return typeof window.home === 'string' && /^[WE]\d+[NS]\d+$/.test(window.home)
    && typeof window.context === 'string' && window.context.length > 0 && window.context.length <= 16000
    && typeof window.product === 'string' && /^[A-Za-z0-9]{1,20}$/.test(window.product);
}
function quantities(item: EmpireProductionWindow): boolean {
  return integer(item.amount,1) && integer(item.rootTarget,item.amount) && integer(item.remaining,0) && item.remaining <= item.amount
    && Number.isSafeInteger(item.observedRoot) && item.observedRoot >= 0 && item.observedRoot <= 100000000;
}
function steps(item: EmpireProductionWindow): boolean {
  const current = item.step === null || validProductionStep(item.step) && item.step.root === item.product;
  return current && validProductionStep(item.initialStep) && item.initialStep.root === item.product;
}
function validWindow(value: unknown): value is EmpireProductionWindow {
  if (!value || typeof value !== 'object') return false;
  const item = value as EmpireProductionWindow;
  return identity(item) && quantities(item) && typeof item.retiring === 'boolean' && steps(item);
}
export const empireProductionSchema: StateSchema<EmpireProductionState> = {
  owner: 'industry',version: 1,initial: () => ({ windows: [] }),migrations: {},
  valid(value: unknown): value is EmpireProductionState {
    if (!value || typeof value !== 'object') return false;
    const windows = (value as EmpireProductionState).windows;
    return Array.isArray(windows) && windows.length <= 50 && windows.every(validWindow) && new Set(windows.map(item => item.home)).size === windows.length;
  },
};
