import { validWorldPosition } from '../../../core/geometry/world-position';
import { movementTransition, stepDirection } from '../transition';
import { withinRange } from '../path-model';
import type { TransitPlan, TransitState } from './model';
/** Normalize PathFinder exits to actual landing coordinates once, before simulation. */
export function createTransitPlan(input: TransitPlan): TransitPlan {
  validatePlan(input);
  let current = { ...input.origin };
  const path = [];
  for (const point of input.path) {
    if (withinRange(current,point,0)) continue;
    const step = movementTransition(current,stepDirection(current,point));
    if (!step) throw new Error('Disconnected transit path');
    current = { ...step.landing }; path.push(current);
  }
  return { ...input,origin: { ...input.origin },path };
}
export function initialTransitState(plan: TransitPlan,readyAt: number,fatigue = 0): TransitState {
  if (![readyAt,fatigue].every(Number.isSafeInteger) || readyAt < 0 || fatigue < 0) throw new Error('Invalid transit opening clock');
  return { unit: plan.unit,position: { ...plan.origin },index: 0,fatigue,readyAt,...(plan.path.length === 0 ? { arrivedAt: readyAt } : {}) };
}

function validatePlan(input: TransitPlan): void {
  if (!input.unit || !input.owner || !Number.isFinite(input.priority) || !validWorldPosition(input.origin)) throw new Error('Invalid transit identity');
  if (![input.weight,input.recovery].every(Number.isSafeInteger) || input.weight < 0 || input.recovery <= 0) throw new Error('Invalid transit mobility');
  if (input.path.length > 2500 || !input.path.every(validWorldPosition)) throw new Error('Invalid transit path');
}
