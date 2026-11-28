import { paidRetirementTransit,validatePaidRetirement } from './retirement';
import { copyPlain } from '../../../../../core/plain-data';
import { validateTransitFrame } from '../../../../../capabilities/movement/transit/validation';
import type { PaidCourierActiveRoute } from '../../../../../features/remotes/startup/routes/model';
import { seedPaidMovement,paidMovementTransit } from './input';
import type { PaidMovementCheckpoint } from './model';
export function restorePaidMovement(home: string,openingTick: number,initial: readonly PaidCourierActiveRoute[],raw: PaidMovementCheckpoint,retired: ReadonlySet<string> = new Set()) {
  const checkpoint = copyPlain(raw),clock = Math.max(openingTick,checkpoint.tick);
  if (!Number.isSafeInteger(checkpoint.tick) || checkpoint.tick < openingTick-1) throw new Error('Invalid paid movement checkpoint clock');
  const routes = seedPaidMovement(home,clock,checkpoint.routes,new Set(checkpoint.retirements?.map(route => route.name)));
  const live = initial.filter(route => !retired.has(route.program.unit));
  if (routes.size !== live.length || live.some(route => JSON.stringify(routes.get(route.program.name)?.program) !== JSON.stringify(route.program))) throw new Error('Paid movement checkpoint program mismatch');
  const retirements = new Map((checkpoint.retirements ?? []).map(route => [route.name,route]));
  if (retirements.size !== (checkpoint.retirements?.length ?? 0)) throw new Error('Duplicate retirement route');
  for (const [name,route] of retirements) {
    const original = routes.get(name); if (!original) throw new Error('Unknown retirement route');
    validatePaidRetirement(route,original.program,clock);
    if (route.observedAt !== checkpoint.tick) throw new Error('Retirement checkpoint clock');
  }
  const active = [...routes.values()].filter(route => route.cursor !== null);
  const expected = new Map(checkpoint.expected.map(state => [state.unit,state]));
  if (expected.size !== checkpoint.expected.length) throw new Error('Duplicate paid movement checkpoint body');
  if (checkpoint.tick < openingTick) {
    if (expected.size) throw new Error('Unexpected initial paid movement effects');
  } else {
    if (expected.size !== active.length || active.some(route => !expected.has(route.program.unit))) throw new Error('Incomplete paid movement checkpoint bodies');
    validateTransitFrame(active.map(route => retirements.has(route.program.name) ? paidRetirementTransit(retirements.get(route.program.name)!).plan : paidMovementTransit(route,route.program.owner).plan),active.map(route => expected.get(route.program.unit)!),checkpoint.tick+1);
  }
  return { routes,retirements,expected,tick: checkpoint.tick };
}
