import type { BoostStep } from '../../../capabilities/industry/boosts/model';
export interface LocalBoostKit { mineral: number; energy: number }
export interface BoostBudget { minerals: Readonly<Record<string,number>>; energy: number; local?: Readonly<Record<string,LocalBoostKit>> }
export interface MutableBoostBudget { minerals: Record<string,number>; energy: number; local: Record<string,LocalBoostKit> }
export interface BoostPrice { mineral: number; energy: number }
export function copyBoostBudget(budget: BoostBudget): MutableBoostBudget {
  return { minerals: { ...budget.minerals },energy: budget.energy,local: Object.fromEntries(Object.entries(budget.local ?? {}).map(([resource,kit]) => [resource,{ ...kit }])) };
}
export function canFundBoost(budget: BoostBudget,resource: string,count: number,price: BoostPrice): boolean {
  const local = budget.local?.[resource];
  return count*price.mineral <= (budget.minerals[resource] ?? 0)+(local?.mineral ?? 0)
    && count*price.energy <= budget.energy+(local?.energy ?? 0);
}
export function spendBoostBudget(budget: MutableBoostBudget,steps: readonly BoostStep[],price: BoostPrice): void {
  for (const step of steps) {
    const kit = budget.local[step.resource], mineral = step.count*price.mineral, energy = step.count*price.energy;
    const localMineral = Math.min(kit?.mineral ?? 0,mineral), localEnergy = Math.min(kit?.energy ?? 0,energy);
    if (kit) { kit.mineral -= localMineral; kit.energy -= localEnergy; }
    budget.minerals[step.resource] = Math.max(0,(budget.minerals[step.resource] ?? 0)-(mineral-localMineral));
    budget.energy = Math.max(0,budget.energy-(energy-localEnergy));
  }
}
