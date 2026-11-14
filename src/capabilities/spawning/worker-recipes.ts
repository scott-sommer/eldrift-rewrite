import { bodyPlan } from './body';
import type { BodyPart, BodyPlan } from './body';
/** Selective port of spawner.js builder/upgrader recipes; admission never exceeds the supplied budget. */
export function builderBody(budget: number, boosted = false): BodyPlan | undefined {
  validateBudget(budget);
  if (boosted) return bodyPlan(grouped(20, 20, 10), budget);
  const capped = Math.min(budget, 2100);
  return bodyPlan(capped < 1000 ? smallWorker(capped) : balancedWorker(capped), budget);
}
export function upgraderBody(budget: number, level: number, remote = false): BodyPlan | undefined {
  validateBudget(budget);
  if (!Number.isInteger(level) || level < 1 || level > 8) throw new Error('Invalid controller level');
  const capped = level === 8 && !remote ? Math.min(budget, 2100) : budget;
  if (capped < 1000) return bodyPlan(smallWorker(capped), budget);
  if (capped < 1500) return bodyPlan(balancedWorker(capped), budget);
  if (capped < 2100) {
    const extra = Math.floor((capped - 1350) / 250);
    return bodyPlan(moveFirst(9 + 2 * extra, 3, 6 + extra), budget);
  }
  if (remote) return bodyPlan(moveFirst(42, 3, 5), budget);
  const extra = Math.min(7, Math.floor((capped - 2100) / 250));
  return bodyPlan(moveFirst(15 + 2 * extra, 3, 9 + extra), budget);
}
function validateBudget(budget: number): void {
  if (!Number.isSafeInteger(budget) || budget < 0) throw new Error('Invalid worker budget');
}
function grouped(work: number, carry: number, move: number): BodyPart[] {
  return [...Array<BodyPart>(work).fill('work'), ...Array<BodyPart>(carry).fill('carry'), ...Array<BodyPart>(move).fill('move')];
}
function moveFirst(work: number, carry: number, move: number): BodyPart[] {
  return [...Array<BodyPart>(move).fill('move'), ...Array<BodyPart>(work).fill('work'), ...Array<BodyPart>(carry).fill('carry')];
}
function smallWorker(budget: number): BodyPart[] {
  const count = budget < 500 ? 1 : budget < 750 ? 2 : 3;
  return grouped(count, count, count * 2);
}
function balancedWorker(budget: number): BodyPart[] {
  const count = Math.floor(budget / 200);
  return grouped(count, count, count);
}
