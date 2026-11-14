import { bodyPlan, repeatedBody } from './body';
import type { BodyPart, BodyPlan } from './body';
/** Pure selective ports from legacy spawner.js; room demand chooses the budget. */
export function roadScavenger(budget: number): BodyPlan | undefined {
  const capped = Math.min(budget, 1600);
  const parts = repeatedBody(['carry', 'carry', 'move'], capped, 48);
  if (capped - parts.length * 50 >= 100) parts.push('carry', 'move');
  return bodyPlan(parts, budget);
}
export function courier(budget: number): BodyPlan | undefined {
  const capped = Math.min(budget, 2600);
  if (capped < 1100) {
    const pairs = repeatedBody(['carry', 'move'], capped);
    return bodyPlan([...pairs.filter(part => part === 'carry'), ...pairs.filter(part => part === 'move')], budget);
  }
  const count = Math.floor((capped - 150) / 150);
  const parts: BodyPart[] = [...Array<BodyPart>(count * 2).fill('carry'), 'work', ...Array<BodyPart>(count + 1).fill('move')];
  return bodyPlan(parts, budget);
}
const minerBodies: readonly (readonly BodyPart[])[] = [
  ['work', 'work', 'work', 'work', 'work', 'work', 'carry', 'carry', 'move', 'move', 'move', 'move'],
  ['work', 'work', 'work', 'work', 'work', 'work', 'carry', 'move', 'move', 'move'],
  ['work', 'work', 'work', 'work', 'carry', 'move', 'move'],
  ['work', 'work', 'carry', 'move'],
  ['work', 'carry', 'move'],
];
export function sourceMiner(budget: number): BodyPlan | undefined {
  for (const parts of minerBodies) {
    const plan = bodyPlan(parts, budget);
    if (plan) return plan;
  }
  return undefined;
}

/** Legacy distributor ratio and RCL6 cap; never inflate an unaffordable budget. */
export function distributor(budget: number, level: number): BodyPlan | undefined {
  const capped = Math.min(budget, level === 6 ? 1150 : 2100);
  const count = Math.floor(capped / 150);
  return bodyPlan([...Array<BodyPart>(count * 2).fill('carry'), ...Array<BodyPart>(count).fill('move')], budget);
}
