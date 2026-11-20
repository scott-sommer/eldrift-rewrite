import { partCosts } from './body';
import type { BodyPart } from './body';
/** Pinned native first-ready frames have already consumed one tick of nominal 1500/600 life. */
export function spawnedActiveTicks(body: readonly BodyPart[]): number {
  if (!body.length || body.length > 50 || body.some(part => !Object.hasOwn(partCosts,part))) throw new Error('Invalid spawned lifetime body');
  return body.includes('claim') ? 599 : 1499;
}
