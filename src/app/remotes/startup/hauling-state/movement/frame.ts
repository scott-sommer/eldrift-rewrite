import { rejoinPaidService } from './rejoin';
import { holdPaidRetirement,planPaidRetirement,paidRetirementTransit } from './retirement';
import type { PaidRetirementRoute } from './retirement';
import { observePaidMovementFrame } from './retirement-frame';
import { requestTransitCursor } from '../../../../../capabilities/movement/transit/observed';
import type { Position } from '../../../../../capabilities/movement/step';
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
import { seedPaidMovement,paidMovementTransit } from './input';
import { restorePaidMovement } from './checkpoint';
import type { PaidMovementCheckpoint } from './model';
import type { PaidMovementExternalFrame } from './model';
/** Private physical movement. Actual service requests and explicit outside movers share one traffic frame. */
export function createPaidHaulingMovement(home: string, openingTick: number, initial: readonly PaidCourierActiveRoute[],
  arbiter: Pick<ReturnType<typeof createActionArbiter>,'issue'>, ports: TransitFramePorts, checkpoint?: PaidMovementCheckpoint,retired: ReadonlySet<string> = new Set()) {
  let routes = seedPaidMovement(home,openingTick,initial), tick = openingTick-1, open = false, failed = false;
  let retirements = new Map<string,PaidRetirementRoute>();
  let expected = new Map<string,TransitState>();
  if (checkpoint) ({ routes,retirements,tick,expected } = restorePaidMovement(home,openingTick,initial,checkpoint,retired));
  const requests = new Map<string,TrafficRequest>(), attempted = new Set<string>();
  function usable(): void { if (failed) throw new Error('Cannot resume failed paid movement'); }
  function requireOpen(): void { usable(); if (!open) throw new Error('Paid movement frame is closed'); }
  function request(name: string, command: PlannedMovementCommand): Outcome {
    requireOpen(); if (retirements.has(name)) return blocked('productive-route-retired',tick);
    const route = routes.get(name);
    if (!route || !route.cursor || tick < route.readyAt) return blocked('route-follow-observation',tick);
    if (!matchesService(route,command)) return blocked('route-follow-service',tick);
    if (attempted.has(name) || route.cursor.requestedAt !== null) return blocked('movement-already-requested',tick);
    attempted.add(name); const plan = paidCourierRoutePlan(route);
    if (route.cursor.index < plan.path.length) routes.set(name,requestPaidCourierRoute(route,tick));
    return followPlannedMovement({ tick,unit: route.program.unit,name,position: route.cursor.position,fatigue: route.fatigue,mobile: true,spawning: false },command,plan,route.cursor.index,
      submitted => { requests.set(submitted.unit,submitted); return { status: 'queued' }; });
  }
  function retirementRoute(name: string): PaidRetirementRoute {
    requireOpen(); const original = routes.get(name),saved = retirements.get(name);
    if (saved) return saved;
    if (!original?.cursor || attempted.has(name)) throw new Error('Unavailable retirement handoff');
    const route = holdPaidRetirement(original.program,{ tick,name,unit: original.program.unit,position: original.cursor.position,
      phase: original.phase,readyAt: Math.max(tick,original.readyAt),energy: original.energy,fatigue: original.fatigue });
    retirements.set(name,route); return route;
  }
  function recover(name: string,command: PlannedMovementCommand,path?: readonly Position[]): Outcome {
    requireOpen();
    if (attempted.has(name)) return blocked('movement-already-requested',tick);
    let route = retirementRoute(name);
    if (path) route = planPaidRetirement(route,command,path);
    if (tick < route.readyAt) return blocked('route-follow-observation',tick);
    attempted.add(name);
    const outcome = followPlannedMovement({ tick,unit: route.unit,name,position: route.cursor.position,fatigue: route.fatigue,mobile: true,spawning: false },command,route.plan,route.cursor.index,
      submitted => { requests.set(submitted.unit,submitted); return { status: 'queued' }; });
    if (requests.has(route.unit)) route = { ...route,cursor: requestTransitCursor(route.plan,route.cursor,tick) };
    retirements.set(name,route); return outcome;
  }
  return {
    begin(frame: number, observations: readonly PaidCourierRouteObservation[]): void {
      usable(); if (open || frame !== tick+1) throw new Error('Invalid paid movement frame order');
      try { ({ routes,retirements } = observePaidMovementFrame(routes,retirements,observations,frame,expected)); }
      catch (error) { failed = true; throw error; }
      tick = frame; open = true; requests.clear(); attempted.clear();
    },
    request,recover,
    resume(name: string): boolean {
      requireOpen(); const original = routes.get(name),recovery = retirements.get(name);
      if (!original || attempted.has(name) || tick >= original.program.retireAt) return false;
      if (!recovery) return true;
      const rejoined = rejoinPaidService(original,recovery,tick); if (!rejoined) return false;
      routes.set(name,rejoined); retirements.delete(name); return true;
    },
    handoff(name: string): void { retirementRoute(name); },
    recovering(name: string): boolean { usable(); return retirements.has(name); },
    finish(external: PaidMovementExternalFrame) {
      requireOpen();
      try {
        const identities = new Set([...routes.values()].map(route => route.program.unit));
        if (external.states.some(state => identities.has(state.unit))) throw new Error('Outside movement reuses a paid body');
        const active = [...routes.values()].filter(route => route.cursor !== null);
        const own = active.map(route => {
          const retirement = retirements.get(route.program.name),owner = requests.get(route.program.unit)?.owner;
          return retirement ? paidRetirementTransit(retirement,owner) : paidMovementTransit(route,owner ?? route.program.owner);
        });
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
    retire(units: ReadonlySet<string>): void {
      usable(); if (open) throw new Error('Cannot retire open paid movement');
      for (const [name,route] of routes) if (units.has(route.program.unit)) { routes.delete(name); retirements.delete(name); }
      for (const unit of units) expected.delete(unit);
    },
    checkpoint(): PaidMovementCheckpoint {
      usable(); if (open) throw new Error('Cannot checkpoint open paid movement frame');
      return copyPlain({ tick,routes: [...routes.values()],expected: [...expected.values()],...(retirements.size ? { retirements: [...retirements.values()] } : {}) });
    },
    current(name: string) { usable(); const route = routes.get(name); return route && copyPlain(route); },
  };
}
function blocked(reason: string,tick: number): Outcome { return { status: 'blocked',reason,retryAt: tick+1 }; }
function matchesService(route: PaidCourierActiveRoute, command: PlannedMovementCommand): boolean {
  const plan = paidCourierRoutePlan(route);
  return command.range === 0 && withinRange(plan.path.at(-1) ?? plan.origin,command.destination,0);
}
