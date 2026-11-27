import { observePaidCourierRoute } from '../../../../features/remotes/startup/routes/progress';
import type { PaidCourierActiveRoute } from '../../../../features/remotes/startup/routes/model';
import type { PaidCourierOpening } from '../motion-observation/opening-model';
export function observedPaidRoute(route: PaidCourierActiveRoute,opening: PaidCourierOpening,tick: number): PaidCourierActiveRoute | undefined {
  const phase = opening.continuation.stage === 'spawning' ? 'spawning' : opening.continuation.stage === 'deliver' ? 'deliver' : 'collect';
  try { return observePaidCourierRoute(route,{ tick,name: opening.observed.name,unit: opening.observed.unit,position: opening.observed.position,phase,readyAt: opening.continuation.readyAt,energy: opening.observed.energy,fatigue: opening.observed.fatigue }); } catch { return undefined; }
}
