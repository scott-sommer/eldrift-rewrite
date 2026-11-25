import { expect, test } from 'vitest';
import { quoteLaborTravel } from '../../src/capabilities/economy/startup/household/labor/travel';
import type { LaborTravelPlan, LaborTravelMeasure } from '../../src/capabilities/economy/startup/household/labor/travel-model';
function fixture(): LaborTravelPlan {
  const point = (x: number,y = 1) => ({ room: 'W0N1',x,y });
  return { home: 'W0N1',body: ['work','carry','move'],kind: 'upgrade',load: 10,remainingLoad: 8,workTicks: 2,
    spawn: { position: point(1),exit: point(2) },source: { position: point(2,2),pickup: point(2) },target: { position: point(8),service: point(5) } };
}
const measure: LaborTravelMeasure = leg => {
  const path = [],direction = Math.sign(leg.destination.x-leg.origin.x);
  for (let x = leg.origin.x; x !== leg.destination.x;) { x += direction; path.push({ ...leg.origin,x }); }
  return { status: 'complete',path,terrain: path.map(() => 2 as const),operations: path.length };
};
test('WORK body uses loaded outward and remaining-cargo return routes with action-ready timing',() => {
  const plan = fixture(), result = quoteLaborTravel(plan,'room-snapshot',measure);
  expect(result.status).toBe('complete'); if (result.status !== 'complete') throw new Error('Expected route');
  expect(result.legs.map(leg => [leg.kind,leg.load,leg.ticks,leg.arrivalFatigue])).toEqual([['approach',0,0,0],['loaded',10,5,2],['return',8,5,2]]);
  expect(result.operations).toBe(6); plan.target.service.x = 7; expect(result.plan.target.service.x).toBe(5);
});
test('work and pickup action frames reduce carried fatigue before the next route',() => {
  const plan = fixture(); plan.workTicks = 1; plan.remainingLoad = 9;
  const swamp: LaborTravelMeasure = (leg,guard) => { const result = measure(leg,guard); return result.status === 'complete' && leg.kind === 'loaded' ? { ...result,terrain: result.path.map(() => 10 as const) } : result; };
  const result = quoteLaborTravel(plan,'swamp-snapshot',swamp); expect(result.status).toBe('complete');
  if (result.status === 'complete') expect(result.legs.map(leg => leg.ticks)).toEqual([0,21,13]);
  plan.workTicks = 2; plan.remainingLoad = 8; plan.spawn.position.x = 0; plan.spawn.exit.x = 1;
  const approach: LaborTravelMeasure = (leg,guard) => { const result = measure(leg,guard); return result.status === 'complete' && leg.kind === 'approach' ? { ...result,terrain: result.path.map(() => 10 as const) } : result; };
  const next = quoteLaborTravel(plan,'pickup-snapshot',approach); if (next.status === 'complete') expect(next.legs.map(leg => leg.ticks)).toEqual([1,8,5]); else throw new Error('Expected route');
});
test('guards and incomplete measurements defer without publishing a partial quote',() => {
  let checks = 0; expect(quoteLaborTravel(fixture(),'snapshot',measure,() => ++checks <= 1)).toMatchObject({ status: 'deferred',completedLegs: 1 });
  expect(quoteLaborTravel(fixture(),'snapshot',() => ({ status: 'deferred',reason: 'path-incomplete' }))).toMatchObject({ status: 'deferred',completedLegs: 0 });
});
test('discontinuous/inexact routes and impossible body consumption refuse',() => {
  const plan = fixture(); const bad: LaborTravelMeasure = (leg,guard) => { const result = measure(leg,guard); if (result.status === 'complete' && result.path.length) result.path[0]!.x += 2; return result; };
  expect(() => quoteLaborTravel(plan,'snapshot',bad)).toThrow('Discontinuous');
  plan.remainingLoad = 0; expect(() => quoteLaborTravel(plan,'snapshot',measure)).toThrow('window');
  plan.remainingLoad = 8; plan.target.service.x = 1; expect(() => quoteLaborTravel(plan,'snapshot',measure)).toThrow('geometry');
});
