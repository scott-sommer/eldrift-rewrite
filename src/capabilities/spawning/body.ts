export const partCosts = { move: 50, work: 100, carry: 50, attack: 80, ranged_attack: 150, heal: 250, claim: 600, tough: 10 } as const;
export type BodyPart = keyof typeof partCosts;
export interface BodyPlan { parts: BodyPart[]; cost: number; spawnTicks: number }
export function bodyCost(parts: readonly BodyPart[]): number {
  return parts.reduce((total, part) => total + partCosts[part], 0);
}
export function bodyPlan(parts: readonly BodyPart[], budget: number): BodyPlan | undefined {
  if (!Number.isSafeInteger(budget) || budget < 0) throw new Error('Invalid body budget');
  if (parts.length > 50) throw new Error('Body exceeds part limit');
  const cost = bodyCost(parts);
  if (!parts.length || cost > budget) return undefined;
  return { parts: [...parts], cost, spawnTicks: parts.length * 3 };
}
export function repeatedBody(pattern: readonly BodyPart[], budget: number, maximumParts = 50): BodyPart[] {
  if (!Number.isSafeInteger(budget) || budget < 0) throw new Error('Invalid body budget');
  if (!pattern.length || !Number.isSafeInteger(maximumParts) || maximumParts < 1 || maximumParts > 50) throw new Error('Invalid body pattern limit');
  const count = Math.min(Math.floor(budget / bodyCost(pattern)), Math.floor(maximumParts / pattern.length));
  return Array.from({ length: count }, () => [...pattern]).flat();
}
