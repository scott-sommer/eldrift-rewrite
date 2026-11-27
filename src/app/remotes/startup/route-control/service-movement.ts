import { copyPlain } from '../../../../core/plain-data';
import { createPaidCourierRouteStore } from '../../../../features/remotes/startup/routes/store';
import type { StatePort } from '../../../../persistence/versioned-state';
import type { createMovementService,MovementCommand } from '../../../../adapters/screeps/movement-service';
import type { PaidUnitContext } from '../motion-observation/model';
import type { PaidCourierContinuationResult } from '../projection/motion/continuation-model';
import type { createPaidCourierRouteControl } from './control';
import type { PaidRouteControlResult } from './model';
export interface PaidRouteMovementOptions {
  contexts(guard: () => boolean): readonly PaidUnitContext[] | undefined;
  activate(context: PaidUnitContext): boolean;
  guard(): boolean;
  report?(context: PaidUnitContext,result: PaidRouteControlResult): void;
}
type Movement = Pick<ReturnType<typeof createMovementService>,'move' | 'follow'>;
type Compile = (context: PaidUnitContext,guard: () => boolean) => PaidCourierContinuationResult;
/** Pre-dispatch observation enables only this frame's qualified productive movement. */
export function createPaidRouteServiceMovement(state: StatePort,movement: Movement,control: ReturnType<typeof createPaidCourierRouteControl>,compile: Compile,options: PaidRouteMovementOptions) {
  const contexts = new Map<string,PaidUnitContext>(); let observedAt = -1;
  function refresh(context: PaidUnitContext): PaidRouteControlResult {
    const current = control.current(context); if (current.status === 'deferred' && current.reason === 'route-state') return current;
    if (!options.activate(context)) return control.observe(context,options.guard);
    const compiled = compile(context,options.guard); if (compiled.status === 'deferred') return compiled;
    const revision = createPaidCourierRouteStore(state,context.cohort.home).read().revision;
    return control.activate(context,compiled.compilation,revision,options.guard);
  }
  function before(): void {
    if (observedAt === Game.time) return;
    observedAt = Game.time; contexts.clear();
    if (!options.guard()) return;
    const current = options.contexts(options.guard); if (!current || current.length > 16) return;
    if (new Set(current.map(context => context.paid.request)).size !== current.length) return;
    for (const raw of current) {
      if (!options.guard()) break;
      const context = copyPlain(raw),result = refresh(context);
      if (result.status === 'ready') contexts.set(context.paid.request,context);
      options.report?.(context,result);
    }
  }
  function move(creep: Creep,command: MovementCommand) {
    const home = creep.memory.population?.home;
    if (!home) return movement.move(creep,command);
    const active = activeRoute(state,home,creep.name);
    if (active === 'invalid') return { status: 'blocked' as const,reason: 'route-state',retryAt: Game.time+1 };
    if (active === 'none') return movement.move(creep,command);
    const context = contexts.get(creep.name);
    if (observedAt !== Game.time || !context) return { status: 'blocked' as const,reason: 'route-context-unavailable',retryAt: Game.time+1 };
    return control.follow(context,creep,command);
  }
  return { before,move };
}

function activeRoute(state: StatePort,home: string,name: string): 'active' | 'none' | 'invalid' {
  try { return createPaidCourierRouteStore(state,home).read().routes.some(route => route.program.name === name) ? 'active' : 'none'; } catch { return 'invalid'; }
}
