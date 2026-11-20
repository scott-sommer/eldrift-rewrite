import type { ProductionInventory, ProductionOptions, ProductionStep, RecipeLookup } from '../../../capabilities/industry/production/model';
import { planProduction } from '../../../capabilities/industry/production/plan';
import type { EmpireProductionWindow } from './model';
function currentStep(window: EmpireProductionWindow,observed: number,remaining: number): ProductionStep | null {
  if (!window.step) return null;
  const target = window.step.product === window.product ? Math.min(window.step.target,observed+remaining) : window.step.target;
  return { ...window.step,target };
}
function unfinished(step: ProductionStep | null,inventory: ProductionInventory,recipe: RecipeLookup): step is ProductionStep {
  return !!step && JSON.stringify(recipe(step.product)) === JSON.stringify(step.reagents) && (inventory.total[step.product] ?? 0) < step.target;
}
/** A completed observation is never undone by later stock consumption or export. */
export function progressEmpireWindow(window: EmpireProductionWindow,inventory: ProductionInventory,recipe: RecipeLookup,options: ProductionOptions): EmpireProductionWindow {
  if (window.retiring) return window;
  const observed = inventory.total[window.product] ?? 0;
  if (!Number.isSafeInteger(observed) || observed < 0 || observed > 100000000) throw new Error('Invalid observed root stock');
  const remaining = Math.max(0,window.remaining-Math.max(0,observed-window.observedRoot));
  window = { ...window,observedRoot: observed };
  if (!remaining) return { ...window,remaining,retiring: true };
  const step = currentStep(window,observed,remaining);
  if (unfinished(step,inventory,recipe)) return { ...window,remaining,step };
  const next = planProduction([{ product: window.product,amount: Math.min(window.rootTarget,observed+remaining),priority: 0 }],inventory,recipe,options);
  return { ...window,remaining,step: next };
}
