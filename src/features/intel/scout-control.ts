import { validateAvoidancePosition } from '../../capabilities/movement/avoidance';
import { execute } from '../../core/execution/execute';
import type { Outcome } from '../../core/execution/model';
import { copyPlain } from '../../persistence/plain-data';
import { natural } from './validation';
import { validScoutRoom } from './scout-validation';
import { validScoutControl } from './scout-control-schema';
import { scoutControlHandlers, complete } from './scout-control-handlers';
import { trackScout } from './scout-control-tracking';
import type { ScoutControl, ScoutControlContext } from './scout-control-model';
export function advanceScout(saved: ScoutControl, context: ScoutControlContext): { control: ScoutControl; outcome: Outcome } {
  validate(saved,context);
  const control = copyPlain(saved);
  if (control.lastTick === context.tick) return { control, outcome: { status: 'running' } };
  trackScout(control,context);
  if (recover(control,context)) {
    control.lastTick = context.tick;
    return { control, outcome: { status: 'blocked', retryAt: context.tick+1, reason: 'scout-replan' } };
  }
  const execution = { phase: control.phase, retries: control.retries, wakeAt: control.wakeAt, expiresAt: control.expiresAt };
  const result = execute(execution, scoutControlHandlers(control), context, context.tick);
  Object.assign(control,result.state);
  if (result.outcome.status === 'failed') fail(control,context,result.outcome.reason);
  if (result.outcome.status === 'running') control.retries = 0;
  control.lastTick = context.tick;
  if (!validScoutControl(control)) throw new Error('Invalid scout transition');
  return { control, outcome: result.outcome };
}
function recover(control: ScoutControl, context: ScoutControlContext): boolean {
  const stuck = control.stuck >= context.policy.stuckTicks;
  const oscillating = control.oscillations >= context.policy.oscillationLimit;
  if (!stuck && !oscillating) return false;
  fail(control,context,oscillating ? 'border-oscillation' : 'stuck');
  control.stuck = 0; control.oscillations = 0;
  return true;
}
function fail(control: ScoutControl, context: ScoutControlContext, reason: string): void {
  if (control.phase === 'evade' || control.phase === 'stabilize') { control.escapeCursor++; control.wakeAt = context.tick+1; control.retries = 0; return; }
  if (control.objective) {
    context.ports.failure(control.objective,reason);
    control.avoidUntil[control.objective] = context.tick+context.policy.routeAvoidTicks;
    complete(control);
  }
  control.phase = 'choose'; control.retries = 0; control.wakeAt = context.tick+1;
}
function validate(control: ScoutControl, context: ScoutControlContext): void {
  validateAvoidancePosition(context.position);
  if (!validScoutRoom(context.position.room)) throw new Error('Invalid scout room');
  if (!validScoutControl(control) || !natural(context.tick)) throw new Error('Invalid scout state/clock');
  if (control.lastTick !== null && context.tick < control.lastTick) throw new Error('Scout clock reversed');
  validatePolicy(context);
}
function validatePolicy(context: ScoutControlContext): void {
  for (const key of ['stabilizeTicks','hostileAvoidTicks','routeAvoidTicks','stuckTicks','oscillationLimit'] as const) {
    const value = context.policy[key];
    if (!natural(value) || !natural(context.tick+value) || value > 1000000) throw new Error('Invalid scout policy clock');
  }
  if (!context.policy.stuckTicks || !context.policy.oscillationLimit) throw new Error('Invalid scout recovery threshold');
  if (context.policy.assigned.length > 64 || !context.policy.assigned.every(validScoutRoom)) throw new Error('Invalid scout assignment');
}
