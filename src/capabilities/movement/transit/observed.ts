import { withinRange } from '../path-model';
import { copyPlain } from '../../../core/plain-data';
import type { Position } from '../step';
import type { TransitPlan } from './model';
export interface ObservedTransitCursor { index: number; observedAt: number; position: Position; requestedAt: number | null }
/** Cursor belongs to one immutable plan; a queued/accepted intent alone never earns physical progress. */
export function observeTransitCursor(plan: TransitPlan,saved: ObservedTransitCursor,tick: number,position: Position): ObservedTransitCursor {
  validateCursor(plan,saved,tick);
  const expected = saved.index === 0 ? plan.origin : plan.path[saved.index-1]!;
  if (!withinRange(saved.position,expected,0)) throw new Error('Observed transit cursor position');
  if (tick === saved.observedAt) {
    if (!withinRange(position,saved.position,0)) throw new Error('Observed transit same-frame drift');
    return copyPlain(saved);
  }
  if (withinRange(position,saved.position,0)) return { ...copyPlain(saved),observedAt: tick,requestedAt: null };
  const next = plan.path[saved.index];
  if (saved.requestedAt === null || !next || !withinRange(position,next,0)) throw new Error('Observed transit physical deviation');
  return { index: saved.index+1,position: { ...position },observedAt: tick,requestedAt: null };
}
export function requestTransitCursor(plan: TransitPlan,saved: ObservedTransitCursor,tick: number): ObservedTransitCursor {
  observeTransitCursor(plan,saved,tick,saved.position);
  if (tick !== saved.observedAt || saved.requestedAt !== null || saved.index === plan.path.length) throw new Error('Observed transit request phase');
  return { ...copyPlain(saved),requestedAt: tick };
}
function validateCursor(plan: TransitPlan,saved: ObservedTransitCursor,tick: number): void {
  if (!Number.isSafeInteger(tick) || !Number.isSafeInteger(saved.observedAt) || saved.observedAt < 0 || tick < saved.observedAt) throw new Error('Observed transit clock');
  if (!Number.isSafeInteger(saved.index) || saved.index < 0 || saved.index > plan.path.length) throw new Error('Observed transit index');
  if (saved.requestedAt !== null && saved.requestedAt !== saved.observedAt) throw new Error('Observed transit request clock');
}
