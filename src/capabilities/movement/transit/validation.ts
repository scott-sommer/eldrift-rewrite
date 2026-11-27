import { withinRange } from '../path-model';
import type { TransitPlan, TransitState } from './model';
export function validateTransitFrame(plans: readonly TransitPlan[],states: readonly TransitState[],tick: number): void {
  if (!Number.isSafeInteger(tick) || tick < 0 || tick >= Number.MAX_SAFE_INTEGER || states.length > 64 || plans.length !== states.length) throw new Error('Invalid transit frame');
  for (const [index,state] of states.entries()) {
    const plan = plans[index]!;
    validateCursor(plan,state);
    validateClock(state,tick);
    if (!withinRange(state.position,state.index === 0 ? plan.origin : plan.path[state.index-1]!,0)) throw new Error('Transit position diverged from path');
  }
}
function validateCursor(plan: TransitPlan,state: TransitState): void {
  if (state.unit !== plan.unit || !Number.isSafeInteger(state.index) || state.index < 0 || state.index > plan.path.length) throw new Error('Invalid transit cursor');
}
function validateClock(state: TransitState,tick: number): void {
  if (state.lastAt !== undefined && state.lastAt+1 !== tick) throw new Error('Nonconsecutive transit frame');
  if (![state.fatigue,state.readyAt].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error('Invalid transit clock');
}
