import { createTransitPlan } from '../../src/capabilities/movement/transit/plan';
import { startupDeliveryInput } from './startup-delivery';
const point = (x: number) => ({ room: 'W0N1',x,y: 25 });
export function startupMotionInput(block = false) {
  const value = startupDeliveryInput(); value.project.spawning.cash.horizon = 70;
  const plan = (origin: number,path: number[]) => createTransitPlan({ unit: 'courier',owner: 'remote',priority: 0,weight: 0,recovery: 2,origin: point(origin),path: path.map(point) });
  value.motion = { routes: [{ request: 'courier',approach: plan(10,[11,12]),empty: plan(10,[11,12]),loaded: plan(12,[11,10]) }],
    terrain: [10,11,12].map(x => ({ position: point(x),rate: 2 })),blockers: block ? [{ unit: 'other',position: point(11),startAt: 0,endAt: 50 }] : [] };
  return value;
}
