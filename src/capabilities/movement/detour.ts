import { createBoundedCache } from '../../core/cache/bounded-cache';
import type { MovementView } from './step';
/** Retain congestion avoidance across successful detour steps, until the goal changes or expires. */
export function createMovementDetours(capacity = 1000) {
  const goals = createBoundedCache<string, string>(capacity);
  return {
    avoid(unit: string, view: MovementView, congested: boolean): boolean {
      const goal = JSON.stringify([view.destination.room, view.destination.x, view.destination.y, view.range]);
      const previous = goals.get(unit, view.tick);
      const active = congested || previous === goal;
      if (active) goals.set(unit, goal, view.tick + 100);
      else goals.invalidate(unit);
      return active;
    },
    forget: (unit: string) => goals.invalidate(unit),
  };
}
