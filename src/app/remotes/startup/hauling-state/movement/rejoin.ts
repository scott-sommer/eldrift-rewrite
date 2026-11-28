import { copyPlain } from '../../../../../core/plain-data';
import { withinRange } from '../../../../../capabilities/movement/path-model';
import type { PaidCourierActiveRoute } from '../../../../../features/remotes/startup/routes/model';
import type { PaidRetirementRoute } from './retirement';
/** Rejoin a known empty-leg suffix at an observed tile; no path or progress is inferred across a gap. */
export function rejoinPaidService(original: PaidCourierActiveRoute,recovery: PaidRetirementRoute,tick: number): PaidCourierActiveRoute | undefined {
  if (tick >= original.program.retireAt || recovery.energy !== 0 || recovery.observedAt !== tick || recovery.cursor.requestedAt !== null) return undefined;
  const points = [original.program.empty.origin,...original.program.empty.path];
  const matches = points.flatMap((point,index) => withinRange(point,recovery.cursor.position,0) ? [index] : []);
  if (matches.length !== 1) return undefined;
  return { program: copyPlain(original.program),leg: 'empty',phase: 'collect',observedAt: tick,readyAt: Math.max(tick,recovery.readyAt),
    energy: recovery.energy,fatigue: recovery.fatigue,cursor: { index: matches[0]!,observedAt: tick,position: { ...recovery.cursor.position },requestedAt: null } };
}
