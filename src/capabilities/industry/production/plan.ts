import type { ProductionInventory, ProductionOptions, ProductionStep, ProductionTarget, RecipeLookup } from './model';
import { ProductionDependencies, validateProductionOptions } from './dependencies';
/** Select the first feasible priority target. Halving the root window allows progress with scarce raw stock. */
export function planProduction(targets: readonly ProductionTarget[],inventory: ProductionInventory,recipe: RecipeLookup,options: ProductionOptions): ProductionStep | null {
  validateProductionOptions(options);
  validateTargets(targets,recipe);
  const budget = { remaining: options.maximumNodes };
  for (const target of [...targets].sort((a,b) => a.priority-b.priority)) {
    const missing = Math.max(0,target.amount-(inventory.total[target.product] ?? 0));
    for (let amount = Math.floor(Math.min(missing,options.batch)/options.reactionAmount)*options.reactionAmount; amount >= options.reactionAmount; amount = Math.floor(amount/(2*options.reactionAmount))*options.reactionAmount) {
      const result = new ProductionDependencies(target.product,inventory,options.inputReserve,options.reactionAmount,recipe,budget).plan(amount);
      if (result) return result;
    }
  }
  return null;
}
function validateTarget(target: ProductionTarget,recipe: RecipeLookup): void {
  if (!Number.isSafeInteger(target.amount) || target.amount < 0 || target.amount > 1000000 || !Number.isSafeInteger(target.priority)) throw new Error('Invalid production target values');
  if (!recipe(target.product)) throw new Error('Unknown lab production target: '+target.product);
}

function validateTargets(targets: readonly ProductionTarget[],recipe: RecipeLookup): void {
  if (targets.length > 16 || new Set(targets.map(target => target.product)).size !== targets.length) throw new Error('Invalid production targets');
  targets.forEach(target => validateTarget(target,recipe));
}
