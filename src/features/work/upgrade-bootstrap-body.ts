import { bodyPlan, repeatedBody, type BodyPlan, type BodyPart } from '../../capabilities/spawning/body';
// Port of spawner.js newSpawner: road-independent travel, then six WORK at larger budgets.
export function upgradeBootstrapBody(budget: number): BodyPlan | undefined {
  if (!Number.isSafeInteger(budget) || budget < 0) throw new Error('Invalid body budget');
  if (budget < 1300) return bodyPlan(repeatedBody(['work', 'carry', 'move', 'move'], budget), budget);
  const carry = Math.min(14, Math.floor((budget - 900) / 100));
  const parts: BodyPart[] = [
    ...Array<BodyPart>(6).fill('work'),
    ...Array<BodyPart>(carry).fill('carry'),
    ...Array<BodyPart>(carry + 6).fill('move'),
  ];
  return bodyPlan(parts, budget);
}
