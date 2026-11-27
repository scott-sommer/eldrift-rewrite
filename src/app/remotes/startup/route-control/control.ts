import { observedPaidRoute } from './observation';
import { createPaidCourierRouteStore } from '../../../../features/remotes/startup/routes/store';
import { requestPaidCourierRoute } from '../../../../features/remotes/startup/routes/progress';
import { paidRouteFollow } from './follow';
import { paidRouteProgram,paidRouteContextMatches } from './program';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { createMovementService,MovementCommand } from '../../../../adapters/screeps/movement-service';
import type { PaidUnitContext } from '../motion-observation/model';
import type { PaidCourierContinuation } from '../projection/motion/continuation-model';
import type { PaidRouteInspector,PaidRouteControlResult } from './model';
/** Before-dispatch facts and route state only; journal, job, finance and action ownership remain separate. */
export function createPaidCourierRouteControl(state: StatePort,movement: Pick<ReturnType<typeof createMovementService>,'follow'>,inspect: PaidRouteInspector) {
  function activate(context: PaidUnitContext,compiled: PaidCourierContinuation,expected: number,guard: () => boolean = () => true): PaidRouteControlResult {
    const facts = inspect(context,guard); if (facts.status === 'deferred') return facts;
    const program = paidRouteProgram(context,compiled,facts.opening,Game.time);
    if (!program || program.routeVersion !== facts.routeVersion || program.topologyVersion !== facts.topologyVersion) return deferred('route-activation-basis');
    if (!guard()) return deferred('budget');
    const store = createPaidCourierRouteStore(state,context.cohort.home);
    try { if (!store.activate(program,expected)) return deferred('route-revision'); } catch { return deferred('route-activation-state'); }
    return current(context);
  }
  function current(context: PaidUnitContext): PaidRouteControlResult {
    try {
      const record = createPaidCourierRouteStore(state,context.cohort.home).read(),route = record.routes.find(route => route.program.name === context.paid.request);
      return route ? { status: 'ready',revision: record.revision,route } : deferred('route-unavailable');
    } catch { return deferred('route-state'); }
  }
  function observe(context: PaidUnitContext,guard: () => boolean = () => true): PaidRouteControlResult {
    const before = current(context); if (before.status === 'deferred') return before;
    const facts = inspect(context,guard,before.route.program); if (facts.status === 'deferred') return facts;
    const program = before.route.program,opening = facts.opening;
    if (!paidRouteContextMatches(program,context) || program.routeVersion !== facts.routeVersion || program.topologyVersion !== facts.topologyVersion) return deferred('route-observation-binding');
    const route = observedPaidRoute(before.route,opening,Game.time);
    if (!route) return deferred('route-physical-deviation');
    if (!guard()) return deferred('budget');
    const store = createPaidCourierRouteStore(state,context.cohort.home);
    return store.progress(program.name,route,Game.time,before.revision) ? current(context) : deferred('route-revision');
  }
  function follow(context: PaidUnitContext,creep: Creep,command: MovementCommand) {
    const before = current(context); if (before.status === 'deferred') return blocked(before.reason);
    const route = before.route,selected = paidRouteFollow(route,context,creep,command);
    if (selected.status === 'blocked') return blocked(selected.reason);
    const { plan,index } = selected;
    if (index === plan.path.length) return movement.follow(creep,command,plan,index);
    const requested = requestPaidCourierRoute(route,Game.time),store = createPaidCourierRouteStore(state,context.cohort.home);
    if (!store.progress(route.program.name,requested,Game.time,before.revision)) return blocked('route-revision');
    return movement.follow(creep,command,plan,index);
  }
  return { activate,observe,follow,current };
}
function deferred(reason: string): PaidRouteControlResult { return { status: 'deferred',reason }; }
function blocked(reason: string) { return { status: 'blocked' as const,reason,retryAt: Game.time+1 }; }
