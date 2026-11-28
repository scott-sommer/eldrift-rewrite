import { withinRange } from '../../../../../capabilities/movement/path-model';
import type { TransitState } from '../../../../../capabilities/movement/transit/model';
import type { PaidCourierActiveRoute,PaidCourierRouteObservation } from '../../../../../features/remotes/startup/routes/model';
import { observePaidMovement } from './input';
import { holdPaidRetirement,observePaidRetirement,validatePaidRetirement } from './retirement';
import type { PaidRetirementRoute } from './retirement';
export function observePaidMovementFrame(routes: ReadonlyMap<string,PaidCourierActiveRoute>,retirements: ReadonlyMap<string,PaidRetirementRoute>,
  observations: readonly PaidCourierRouteObservation[],tick: number,expected: ReadonlyMap<string,TransitState>) {
  if (observations.length !== routes.size || new Set(observations.map(value => value.name)).size !== routes.size) throw new Error('Invalid paid movement roster');
  const next = new Map(retirements),ordinary: PaidCourierRouteObservation[] = [];
  for (const value of observations) {
    const original = validateObservation(routes.get(value.name),value,tick,expected.get(value.unit));
    const retired = next.get(value.name);
    if (retired) next.set(value.name,observePaidRetirement(retired,value));
    else if (tick >= original.program.retireAt) next.set(value.name,holdPaidRetirement(original.program,value));
    else ordinary.push(value);
    const current = next.get(value.name); if (current) validatePaidRetirement(current,original.program,tick);
  }
  const active = new Map([...routes].filter(([name]) => !next.has(name)));
  const updated = observePaidMovement(active,ordinary,tick,expected);
  return { routes: new Map([...routes].map(([name,route]) => [name,updated.get(name) ?? route])),retirements: next };
}

function validateObservation(original: PaidCourierActiveRoute | undefined,value: PaidCourierRouteObservation,tick: number,prior: TransitState | undefined): PaidCourierActiveRoute {
  if (!original || value.unit !== original.program.unit || value.tick !== tick) throw new Error('Invalid paid movement observation');
  if (prior && (!withinRange(prior.position,value.position,0) || prior.fatigue !== value.fatigue)) throw new Error('Paid movement physical deviation');
  return original;
}
