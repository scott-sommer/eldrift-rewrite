import type { ScoutControl, ScoutControlContext } from './scout-control-model';
export function trackScout(control: ScoutControl, context: ScoutControlContext): void {
  const { position, tick } = context;
  if (JSON.stringify(control.assigned) !== JSON.stringify(context.policy.assigned)) {
    control.assigned = [...context.policy.assigned]; control.assignmentIndex = 0; control.objective = null;
    control.phase = 'choose'; control.wakeAt = tick;
  }
  if (control.room !== position.room || control.lastPosition === null) enterRoom(control,context);
  trackProgress(control,context);
  control.avoidUntil = Object.fromEntries(Object.entries(control.avoidUntil).filter(([,until]) => until > tick));
  if (context.dangerous) {
    control.avoidUntil[position.room] = tick + context.policy.hostileAvoidTicks;
    if (control.phase !== 'evade') { control.retries = 0; control.phase = 'evade'; }
    control.wakeAt = tick;
  }
}
function enterRoom(control: ScoutControl, { position, tick }: ScoutControlContext): void {
  const reversed = control.previousRoom === position.room && control.transitionAt !== null && tick-control.transitionAt <= 2;
  control.oscillations = reversed ? control.oscillations+1 : 0;
  control.previousRoom = control.lastPosition === null ? null : control.room;
  control.transitionAt = tick; control.room = position.room; control.enteredAt = tick;
  control.visited = false; control.phase = 'stabilize'; control.wakeAt = tick; control.retries = 0;
}
function trackProgress(control: ScoutControl, { position, canMove }: ScoutControlContext): void {
  const last = control.lastPosition;
  const unchanged = last && last.room === position.room && last.x === position.x && last.y === position.y;
  control.stuck = unchanged && canMove && control.moving ? control.stuck+1 : 0;
  control.lastPosition = { ...position }; control.moving = false;
}
export function scoutOnBorder(position: { x: number; y: number }): boolean {
  return position.x === 0 || position.y === 0 || position.x === 49 || position.y === 49;
}
