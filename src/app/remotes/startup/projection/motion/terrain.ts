import { movementTransition,stepDirection } from '../../../../../capabilities/movement/transition';
import { withinRange } from '../../../../../capabilities/movement/path-model';
import { tileKey } from '../../../../../capabilities/movement/traffic/model';
import type { Position } from '../../../../../capabilities/movement/step';
import type { MotionGeometryEnvironment } from './model';
export function createMotionTerrain(environment: MotionGeometryEnvironment) {
  const facts = new Map<string,{ position: Position; rate: 1 | 2 | 10 }>();
  function capture(position: Position): boolean {
    const key = tileKey(position); if (facts.has(key)) return true;
    const rate = environment.rate(position);
    if (rate === undefined || facts.size >= 10000) return false;
    facts.set(key,{ position: { ...position },rate }); return true;
  }
  return {
    path(origin: Position,path: readonly Position[],guard: () => boolean): string | undefined {
      let current = origin;
      if (!capture(origin)) return 'motion-path';
      for (const [index,point] of path.entries()) {
        if (index%32 === 0 && !guard()) return 'budget';
        if (withinRange(current,point,0)) continue;
        const step = movementTransition(current,stepDirection(current,point));
        if (!step || !capture(step.local) || !capture(step.landing)) return 'motion-path';
        current = step.landing;
      }
      return undefined;
    },
    rate(position: Position) { return facts.get(tileKey(position))!.rate; },
    result() { return [...facts.values()].map(fact => ({ position: { ...fact.position },rate: fact.rate })); },
  };
}
