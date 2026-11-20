import type { ProductionInventory, ProductionOptions, ProductionStep, ProductionTarget, RecipeLookup } from './model';
import { planProductionBatch, validateProductionTargets } from './plan';
import { validateProductionOptions } from './dependencies';
export interface EmpireProductionRoom { home: string; inventory: ProductionInventory; options: ProductionOptions }
export interface ProductionCommitment { home: string; product: string; amount: number }
export interface EmpireProductionAssignment extends ProductionCommitment { step: ProductionStep }
interface EmpireProductionInput {
  targets: readonly ProductionTarget[]; stock: Readonly<Record<string,number>>; rooms: readonly EmpireProductionRoom[];
  commitments: readonly ProductionCommitment[]; maximumNodes: number;
}
function positive(value: number): boolean { return Number.isSafeInteger(value) && value > 0 && value <= 1000000; }
function validateScopes(input: EmpireProductionInput,recipe: RecipeLookup): void {
  if (input.rooms.length > 50 || new Set(input.rooms.map(room => room.home)).size !== input.rooms.length) throw new Error('Invalid empire production rooms');
  if (input.commitments.length > 50 || new Set(input.commitments.map(item => item.home)).size !== input.commitments.length) throw new Error('Invalid empire production commitments');
  if (input.commitments.some(item => !item.home || !positive(item.amount) || !recipe(item.product))) throw new Error('Invalid empire production commitment');
}
function validateObservedStock(input: EmpireProductionInput): void {
  if (Object.values(input.stock).some(amount => !Number.isSafeInteger(amount) || amount < 0)) throw new Error('Invalid empire stock');
  for (const target of input.targets) {
    const observed = input.rooms.reduce((sum,room) => sum+(room.inventory.total[target.product] ?? 0),0);
    if (observed > (input.stock[target.product] ?? 0)) throw new Error('Empire stock omits local product');
  }
}
function validate(input: EmpireProductionInput,recipe: RecipeLookup): void {
  if (!Number.isSafeInteger(input.maximumNodes) || input.maximumNodes < 1 || input.maximumNodes > 10000) throw new Error('Invalid empire production budget');
  validateScopes(input,recipe); validateProductionTargets(input.targets,recipe); validateObservedStock(input);
  input.rooms.forEach(room => { if (!room.home) throw new Error('Invalid empire room identity'); validateProductionOptions(room.options); });
}
function planRoom(room: EmpireProductionRoom,target: ProductionTarget,recipe: RecipeLookup,budget: { remaining: number }) {
  const allowance = Math.min(budget.remaining,room.options.maximumNodes), local = { remaining: allowance };
  const result = planProductionBatch([target],room.inventory,recipe,room.options,local);
  budget.remaining -= allowance-local.remaining; return result;
}
/** Shared final-product deficit, disjoint local funding and at most one outstanding assignment per room. */
export function planEmpireProduction(input: EmpireProductionInput,recipe: RecipeLookup): EmpireProductionAssignment[] {
  validate(input,recipe);
  const remaining = new Map(input.targets.map(target => [target.product,Math.max(0,target.amount-(input.stock[target.product] ?? 0))]));
  for (const item of input.commitments) remaining.set(item.product,Math.max(0,(remaining.get(item.product) ?? 0)-item.amount));
  const busy = new Set(input.commitments.map(item => item.home)), result: EmpireProductionAssignment[] = [], budget = { remaining: input.maximumNodes };
  const rooms = [...input.rooms].sort((a,b) => a.home.localeCompare(b.home));
  for (const target of [...input.targets].sort((a,b) => a.priority-b.priority || a.product.localeCompare(b.product))) {
    for (const room of rooms.filter(item => !busy.has(item.home))) {
      const missing = remaining.get(target.product) ?? 0; if (!missing) break;
      const localTarget = { ...target,amount: (room.inventory.total[target.product] ?? 0)+missing };
      const planned = planRoom(room,localTarget,recipe,budget); if (!planned) continue;
      result.push({ home: room.home,product: target.product,amount: planned.amount,step: planned.step });
      remaining.set(target.product,missing-planned.amount); busy.add(room.home);
    }
  }
  return result;
}
