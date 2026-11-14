import { createBoundedCache } from '../../core/cache/bounded-cache';
import type { Position } from './step';
interface Progress { position: Position; observedAt: number; attemptedAt: number; failures: number }
function same(a: Position, b: Position): boolean {
  return a.room === b.room && a.x === b.x && a.y === b.y;
}
export function createMovementProgress(capacity = 1000) {
  const cache = createBoundedCache<string, Progress>(capacity);
  function mark(unit: string, tick: number): void {
    const progress = cache.get(unit, tick);
    if (!progress || progress.observedAt !== tick) throw new Error('Observe movement before settlement');
    progress.attemptedAt = tick;
  }
  return {
    observe(unit: string, position: Position, tick: number, mobile: boolean): number {
      const previous = cache.get(unit, tick);
      if (previous?.observedAt === tick) return previous.failures;
      const failed = mobile && previous?.attemptedAt === tick - 1 && same(previous.position, position);
      const failures = failed ? previous.failures + 1 : 0;
      cache.set(unit, { position: { ...position }, observedAt: tick, attemptedAt: -1, failures }, tick + 10);
      return failures;
    },
    issued: mark,
    trafficBlocked: mark,
    forget: (unit: string) => cache.invalidate(unit),
  };
}
