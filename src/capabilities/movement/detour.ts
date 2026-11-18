import { createBoundedCache } from '../../core/cache/bounded-cache';
import type { MovementView } from './step';
/** Retain congestion avoidance across successful detour steps, until the goal changes or expires. */
export function createMovementDetours(capacity = 1000) {
  const goals = createBoundedCache<string, { goal: string; avoid: boolean }>(capacity);
  return {
    avoid(unit: string, view: MovementView, congested: boolean): boolean {
      const goal = JSON.stringify([view.destination.room, view.destination.x, view.destination.y, view.range]);
      const previous = goals.get(unit, view.tick);
      const active = congested || previous?.goal === goal && previous.avoid;
      goals.set(unit, { goal,avoid: active }, view.tick + 100);
      return active;
    },
    blocked(unit: string, tick: number): void {
      const previous = goals.get(unit,tick);
      if (previous) goals.set(unit,{ ...previous,avoid: true },tick+100);
    },
    forget: (unit: string) => goals.invalidate(unit),
  };
}
