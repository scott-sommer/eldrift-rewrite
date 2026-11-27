import { expect,test } from 'vitest';
import { paidRouteFixture } from '../fixtures/paid-route';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createPaidCourierRouteStore } from '../../src/features/remotes/startup/routes/store';
import { activatePaidCourierRoute,observePaidCourierRoute,requestPaidCourierRoute } from '../../src/features/remotes/startup/routes/progress';
import type { PaidCourierRouteObservation } from '../../src/features/remotes/startup/routes/model';
test('route catalog reads without initialization, copies activation, survives JSON and rejects stale writes',() => {
  const f = paidRouteFixture(),root = {},state = createMemoryPort(() => root),store = createPaidCourierRouteStore(state,'W0N1');
  expect(store.read().routes).toEqual([]); expect(root).toEqual({});
  expect(store.activate(f.program,0)).toBe(true); f.program.empty.origin.x = 1;
  const saved = JSON.parse(JSON.stringify(root)),restored = createPaidCourierRouteStore(createMemoryPort(() => saved),'W0N1');
  expect(restored.read().routes[0]!.program.empty.origin.x).toBe(10);
  const current = restored.read(),before = JSON.stringify(saved);
  expect(restored.progress('paid-courier',current.routes[0]!,101,0)).toBe(false); expect(JSON.stringify(saved)).toBe(before);
  expect(restored.release('paid-courier','reused-name-wrong-id',101,1)).toBe(false);
  expect(restored.release('paid-courier','native-id',101,1)).toBe(true); expect(restored.read().routes).toEqual([]);
});
test('loaded route advances only observed steps and changes to empty only at verified delivery service',() => {
  const f = paidRouteFixture(); let route = activatePaidCourierRoute(f.program);
  const observe = (tick: number,x: number,energy: number,phase: PaidCourierRouteObservation['phase'] = 'deliver',readyAt = tick) => ({ tick,name: f.program.name,unit: f.program.unit,position: f.point(x),phase,readyAt,energy,fatigue: 0 });
  expect(() => observePaidCourierRoute(route,observe(101,14,16))).toThrow('cargo deviation');
  expect(() => observePaidCourierRoute(route,observe(101,14,0,'collect'))).toThrow('service transition');
  for (let step = 0; step < 4; step++) route = observePaidCourierRoute(requestPaidCourierRoute(route,100+step),observe(101+step,13-step,32));
  route = observePaidCourierRoute(route,observe(105,10,16)); expect(route.energy).toBe(16);
  route = observePaidCourierRoute(route,observe(106,10,0,'collect',107)); expect(route.leg).toBe('empty');
  expect(() => requestPaidCourierRoute(route,106)).toThrow('unavailable');
  route = observePaidCourierRoute(route,observe(107,10,0,'collect')); expect(requestPaidCourierRoute(route,107).cursor!.index).toBe(0);
});
test('incubation has no invented physical cursor and wrong spawn exit or body identity refuses',() => {
  const f = paidRouteFixture(),program = f.program;
  program.activeAt = 110; program.opening = { ...program.opening,spawning: true,phase: 'collect',readyAt: 110,energy: 0,plan: program.empty };
  const route = activatePaidCourierRoute(program),observation = { tick: 110,name: program.name,unit: program.unit,position: f.point(10),phase: 'collect' as const,readyAt: 110,energy: 0,fatigue: 0 };
  expect(route.cursor).toBeNull(); const active = observePaidCourierRoute(route,observation); expect(active.cursor!.index).toBe(0);
  expect(() => observePaidCourierRoute(active,{ ...observation,tick: 109,phase: 'spawning' })).toThrow('identity');
  expect(() => observePaidCourierRoute(route,{ ...observation,position: f.point(9) })).toThrow();
  expect(() => observePaidCourierRoute(route,{ ...observation,unit: 'new-native-id' })).toThrow('identity');
});

test('legacy route migration preserves body/program and never infers fresh incubation from another route clock',() => {
  const f = paidRouteFixture(),root = {},state = createMemoryPort(() => root),store = createPaidCourierRouteStore(state,'W0N1');
  store.activate(f.program,0); const record = store.read();
  const legacy = { ...record,clock: 105,routes: record.routes.map(route => ({ program: route.program,leg: route.leg,phase: route.phase,readyAt: route.readyAt,energy: route.energy,fatigue: route.fatigue,cursor: route.cursor })) };
  legacy.routes[0]!.program.activeAt = 110; legacy.routes[0]!.program.opening = { ...legacy.routes[0]!.program.opening,spawning: true,phase: 'collect',energy: 0,readyAt: 110,plan: legacy.routes[0]!.program.empty };
  legacy.routes[0]!.phase = 'collect'; legacy.routes[0]!.energy = 0; legacy.routes[0]!.readyAt = 110; legacy.routes[0]!.cursor = null;
  state.write('remoteStartupRoutes/W0N1',{ owner: 'remotes',version: 1,data: legacy }); const before = JSON.stringify(root);
  const restored = store.read(); expect(restored.routes[0]!.observedAt).toBe(100); expect(restored.clock).toBe(105);
  expect(restored.routes[0]!.program.unit).toBe('native-id'); expect(JSON.stringify(root)).toBe(before);
});
