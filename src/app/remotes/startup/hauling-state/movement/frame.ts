import { copyPlain } from '../../../../../core/plain-data';
import type { createActionArbiter } from '../../../../../core/execution/action-arbiter';
import type { Outcome } from '../../../../../core/execution/model';
import { withinRange } from '../../../../../capabilities/movement/path-model';
import { followPlannedMovement } from '../../../../../capabilities/movement/fixed-step';
import type { PlannedMovementCommand } from '../../../../../capabilities/movement/fixed-step';
import { advanceTransitFrame } from '../../../../../capabilities/movement/transit/frame';
import type { TransitFramePorts } from '../../../../../capabilities/movement/transit/frame';
import type { TransitState } from '../../../../../capabilities/movement/transit/model';
import type { TrafficRequest } from '../../../../../capabilities/movement/traffic/model';
import { paidCourierRoutePlan,requestPaidCourierRoute } from '../../../../../features/remotes/startup/routes/progress';
import type { PaidCourierActiveRoute,PaidCourierRouteObservation } from '../../../../../features/remotes/startup/routes/model';
import { seedPaidMovement,observePaidMovement,paidMovementTransit } from './input';
import { restorePaidMovement } from './checkpoint';
import type { PaidMovementCheckpoint } from './model';
import type { PaidMovementExternalFrame } from './model';
/** Private physical movement. Actual service requests and explicit outside movers share one traffic frame. */
export function createPaidHaulingMovement(home: string, openingTick: number, initial: readonly PaidCourierActiveRoute[],
  arbiter: Pick<ReturnType<typeof createActionArbiter>,'issue'>, ports: TransitFramePorts, checkpoint?: PaidMovementCheckpoint) {
  let routes = seedPaidMovement(home,openingTick,initial), tick = openingTick-1, open = false, failed = false;
  let expected = new Map<string,TransitState>();
  if (checkpoint) ({ routes,tick,expected } = restorePaidMovement(home,openingTick,initial,checkpoint));
  const requests = new Map<string,TrafficRequest>(), attempted = new Set<string>();
  function usable(): void { if (failed) throw new Error('Cannot resume failed paid movement'); }
  function requireOpen(): void { usable(); if (!open) throw new Error('Paid movement frame is closed'); }
  function request(name: string, command: PlannedMovementCommand): Outcome {
    requireOpen(); const route = routes.get(name);
    if (!route || !route.cursor || tick < route.readyAt) return blocked('route-follow-observation',tick);
    if (!matchesService(route,command)) return blocked('route-follow-service',tick);
    if (attempted.has(name) || route.cursor.requestedAt !== null) return blocked('movement-already-requested',tick);
    attempted.add(name); const plan = paidCourierRoutePlan(route);
    if (route.cursor.index < plan.path.length) routes.set(name,requestPaidCourierRoute(route,tick));
    return followPlannedMovement({ tick,unit: route.program.unit,name,position: route.cursor.position,fatigue: route.fatigue,mobile: true,spawning: false },command,plan,route.cursor.index,
      submitted => { requests.set(submitted.unit,submitted); return { status: 'queued' }; });
  }
  return {
    begin(frame: number, observations: readonly PaidCourierRouteObservation[]): void {
      usable(); if (open || frame !== tick+1) throw new Error('Invalid paid movement frame order');
      try { routes = observePaidMovement(routes,observations,frame,expected); }
      catch (error) { failed = true; throw error; }
      tick = frame; open = true; requests.clear(); attempted.clear();
    },
    request,
    finish(external: PaidMovementExternalFrame) {
      requireOpen();
      try {
        const identities = new Set([...routes.values()].map(route => route.program.unit));
        if (external.states.some(state => identities.has(state.unit))) throw new Error('Outside movement reuses a paid body');
        const active = [...routes.values()].filter(route => route.cursor !== null);
        const own = active.map(route => paidMovementTransit(route,requests.get(route.program.unit)?.owner ?? route.program.owner));
        const result = advanceTransitFrame([...own.map(value => value.plan),...external.plans],[...own.map(value => value.state),...external.states],tick,external.occupants,ports,[...requests.keys(),...external.requestedUnits]);
        for (const request of result.resolution.accepted) {
          if (!request.order) throw new Error('Missing movement action identity');
          const issued = arbiter.issue(request.order,request.owner,['move'],() => 0,code => code === 0);
          if (issued.status !== 'issued') throw new Error('Paid movement action ownership invalidated');
        }
        expected = new Map(result.states.slice(0,own.length).map(state => [state.unit,state])); open = false;
        return copyPlain(result);
      } catch (error) { failed = true; throw error; }
    },
    checkpoint(): PaidMovementCheckpoint {
      usable(); if (open) throw new Error('Cannot checkpoint open paid movement frame');
      return copyPlain({ tick,routes: [...routes.values()],expected: [...expected.values()] });
    },
    current(name: string) { usable(); const route = routes.get(name); return route && copyPlain(route); },
  };
}
function blocked(reason: string,tick: number): Outcome { return { status: 'blocked',reason,retryAt: tick+1 }; }
function matchesService(route: PaidCourierActiveRoute, command: PlannedMovementCommand): boolean {
  const plan = paidCourierRoutePlan(route);
  return command.range === 0 && withinRange(plan.path.at(-1) ?? plan.origin,command.destination,0);
}
