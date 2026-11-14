import type { BodyPart } from '../../capabilities/spawning/body';
import { roadScavenger } from '../../capabilities/spawning/economy-recipes';
export interface ScavengerBodies {
  availableEnergy: number; capacityEnergy: number; maximumBudget: number;
  live: readonly (readonly BodyPart[])[]; pending: readonly (readonly BodyPart[])[];
}
function fullSize(body: readonly BodyPart[], maximum: readonly BodyPart[]): boolean {
  return body.length >= maximum.length && ['carry', 'move'].every(part =>
    body.filter(item => item === part).length >= maximum.filter(item => item === part).length);
}
/** Snapshot the first affordable body; escalate only once an undersized scavenger exists. */
export function planRecoveryScavenger(input: ScavengerBodies) {
  const maximum = roadScavenger(Math.min(input.capacityEnergy, input.maximumBudget));
  if (!maximum || input.pending.length || input.live.some(body => fullSize(body, maximum.parts))) return undefined;
  if (input.live.length) return { body: maximum.parts, priority: 1 };
  const initial = roadScavenger(Math.min(input.availableEnergy, input.capacityEnergy, input.maximumBudget));
  return initial ? { body: initial.parts, priority: -1 } : undefined;
}
