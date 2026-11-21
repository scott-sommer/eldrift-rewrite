import type { ProductionTarget, RecipeLookup } from './model';
import { validateProductionThresholds } from './plan';
interface StockThresholdOptions { base: number; perTerminal: number; terminals: number }
function intermediateTarget(options: StockThresholdOptions): number {
  if (![options.base,options.perTerminal,options.terminals].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid intermediate target policy');
  if (options.terminals > 50) throw new Error('Invalid terminal count');
  const target = options.base+options.perTerminal*options.terminals;
  if (target > 1000000) throw new Error('Intermediate target exceeds production bounds');
  return target;
}
function validateVisit(product: string,path: readonly string[],visits: number): void {
  if (visits > 64 || path.includes(product)) throw new Error('Cyclic or excessive reaction dependencies');
}
/** Preserve the legacy expand-right-first/reverse discovery ordering with explicit cycle and work bounds. */
function compoundOrder(root: string,recipe: RecipeLookup): string[] {
  const stack = [{ product: root,path: [] as string[] }], seen = new Set<string>(), order = [root];
  let visits = 0;
  while (stack.length) {
    const { product,path } = stack.pop()!;
    validateVisit(product,path,++visits);
    if (seen.has(product)) continue;
    seen.add(product);
    for (const reagent of recipe(product) ?? []) {
      if (!recipe(reagent)) continue;
      if (!order.includes(reagent)) order.push(reagent);
      stack.push({ product: reagent,path: [...path,product] });
    }
  }
  if (order.length > 16) throw new Error('Too many intermediate targets');
  return order.reverse();
}
/** Global inventory targets are demands, never local resource reservations or manufactured receipts. */
export function selectStockThresholds(thresholds: readonly ProductionTarget[],stock: Readonly<Record<string,number>>,recipe: RecipeLookup,options: StockThresholdOptions) {
  validateProductionThresholds(thresholds,recipe);
  if (Object.values(stock).some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error('Invalid production stock');
  const floor = intermediateTarget(options), selected = thresholds.map((target,index) => ({ target,index })).sort((a,b) => a.target.priority-b.target.priority || a.index-b.index)
    .find(({ target }) => (stock[target.product] ?? 0) < target.amount);
  if (!selected) return { targets: [] as ProductionTarget[],selection: null,intermediate: floor };
  const { target,index } = selected;
  const targets = compoundOrder(target.product,recipe).filter(product => product === target.product || (stock[product] ?? 0) < floor)
    .map((product,priority) => ({ product,priority,amount: product === target.product ? target.amount : floor }));
  return { targets,selection: { index,product: target.product,amount: target.amount },intermediate: floor };
}
