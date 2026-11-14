import { createMovementProgress } from './progress';
import { movementStep } from './step';
import type { MovementView, MovementPorts, MovementIntent, Position } from './step';
import type { PathRequest } from './path-model';
import { withinRange } from './path-model';
import type { createPathService } from './path-service';
interface NavigationPorts {
  paths: ReturnType<typeof createPathService>;
  request(view: MovementView, avoidUnits: boolean): PathRequest;
  direction(origin: Position, next: Position): number;
  move(unit: string, direction: number): MovementIntent;
  rejected: MovementPorts['rejected'];
}
/** Caller owns shared movement arbitration; this service never invokes native moveTo. */
export function createNavigator(ports: NavigationPorts, repathAfter = 2) {
  if (!Number.isSafeInteger(repathAfter) || repathAfter < 1) throw new Error('Invalid repath threshold');
  const progress = createMovementProgress();
  const navigate = (unit: string, view: MovementView, mobile = true) => {
    const failures = progress.observe(unit, view.position, view.tick, mobile && view.fatigue === 0);
    if (withinRange(view.position, view.destination, view.range)) {
      progress.forget(unit);
      return { status: 'done' as const };
    }
    if (!mobile) return { status: 'failed' as const, reason: 'no-active-move' };
    const result = movementStep(view, {
      route: () => {
        const avoidUnits = failures >= repathAfter;
        const request = ports.request(view, avoidUnits);
        if (avoidUnits) ports.paths.invalidate(request);
        const path = ports.paths.find(request);
        if (path.status === 'no-route') return { status: 'unavailable', reason: path.reason, retryAt: view.tick + 1 };
        const next = path.path[0];
        if (!next) return { status: 'unavailable', reason: 'empty-path', retryAt: view.tick + 1 };
        return { status: 'ready', direction: ports.direction(view.position, next), incomplete: path.status === 'incomplete' };
      },
      move: direction => {
        const intent = ports.move(unit, direction);
        if (intent.status === 'issued') progress.issued(unit, view.tick);
        return intent;
      },
      rejected: ports.rejected,
    });
    if (result.status === 'done') progress.forget(unit);
    return result;
  };
  return Object.assign(navigate, {
    settle(unit: string, tick: number, outcome: 'issued' | 'traffic-blocked'): void {
      if (outcome === 'issued') progress.issued(unit, tick);
      else progress.trafficBlocked(unit, tick);
    },
  });
}
