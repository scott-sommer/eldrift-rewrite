import type { Handlers } from '../../core/execution/model';
import type { Outcome } from '../../core/execution/model';
import { scoutOnBorder } from './scout-control-tracking';
import type { ScoutControl, ScoutControlContext } from './scout-control-model';
export function scoutControlHandlers(control: ScoutControl): Handlers<ScoutControlContext> {
  return {
    choose: context => choose(control,context),
    stabilize: context => stabilize(control,context),
    travel: context => travel(control,context),
    evade: context => evade(control,context),
  };
}
function choose(control: ScoutControl, context: ScoutControlContext): Outcome {
  const assigned = control.assigned[control.assignmentIndex];
  control.objective = assigned ?? context.ports.next(control) ?? null;
  if (!control.objective) return { status: 'blocked', retryAt: context.tick+10, reason: 'no-scout-target' };
  return { status: 'transition', phase: control.objective === context.position.room ? 'stabilize' : 'travel' };
}
function stabilize(control: ScoutControl, context: ScoutControlContext): Outcome {
  if (scoutOnBorder(context.position)) return moving(control,context.ports.stabilize(control.escapeCursor));
  if (context.tick-control.enteredAt < context.policy.stabilizeTicks) {
    return { status: 'blocked', retryAt: context.tick+1, reason: 'entry-stabilizing' };
  }
  if (!control.visited) { context.ports.capture(true); control.visited = true; }
  if (control.objective === context.position.room) complete(control);
  return { status: 'transition', phase: control.objective ? 'travel' : 'choose' };
}
function travel(control: ScoutControl, context: ScoutControlContext): Outcome {
  if (!control.objective) return { status: 'transition', phase: 'choose' };
  if (control.objective === context.position.room) return { status: 'transition', phase: 'stabilize' };
  return moving(control,context.ports.travel(control.objective, control.avoidUntil));
}
function evade(control: ScoutControl, context: ScoutControlContext): Outcome {
  context.ports.capture(false);
  const destination = context.ports.escape(control.avoidUntil,control.escapeCursor);
  if (!destination) return { status: 'blocked', retryAt: context.tick+1, reason: 'no-safe-exit' };
  return moving(control,context.ports.travel(destination,control.avoidUntil));
}
function moving(control: ScoutControl, outcome: Outcome): Outcome {
  control.moving = outcome.status === 'running';
  if (outcome.status === 'blocked' && ['fatigue','scout-route-admission'].includes(outcome.reason)) return { status: 'running' };
  return outcome;
}
export function complete(control: ScoutControl): void {
  if (control.assigned[control.assignmentIndex] === control.objective) control.assignmentIndex++;
  control.objective = null;
}
