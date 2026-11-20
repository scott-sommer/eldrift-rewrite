import type { StatePort } from '../../persistence/versioned-state';
import { openState, saveState } from '../../persistence/versioned-state';
import { stateKey } from '../../persistence/state-key';
import { productionSchema } from './production-state';
import { planProduction } from '../../capabilities/industry/production/plan';
import type { ProductionInventory, ProductionOptions, ProductionStep, ProductionTarget, RecipeLookup } from '../../capabilities/industry/production/model';
export function selectLabProduction(state: StatePort,room: string,context: string,targets: readonly ProductionTarget[],inventory: ProductionInventory,recipe: RecipeLookup,options: ProductionOptions): ProductionStep | null {
  const key = stateKey('industry-production',room), saved = openState(state,key,productionSchema);
  if (saved.context === context && saved.step && pending(saved.step,targets,inventory,recipe)) return saved.step;
  const step = planProduction(targets,inventory,recipe,options);
  saveState(state,key,productionSchema,{ context,step });
  return step;
}
function pending(step: ProductionStep,targets: readonly ProductionTarget[],inventory: ProductionInventory,recipe: RecipeLookup): boolean {
  const root = targets.find(target => target.product === step.root);
  return JSON.stringify(step.reagents) === JSON.stringify(recipe(step.product)) && !!root && (inventory.total[root.product] ?? 0) < root.amount && (inventory.total[step.product] ?? 0) < step.target;
}
export function clearLabProduction(state: StatePort,room: string): void {
  const key = stateKey('industry-production',room);
  if (state.read(key) === undefined) return;
  const saved = openState(state,key,productionSchema);
  if (saved.step || saved.context) saveState(state,key,productionSchema,productionSchema.initial());
}
