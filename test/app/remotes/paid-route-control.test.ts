import { afterEach,expect,test,vi } from 'vitest';
import { paidRouteControlFixture as fixture } from '../../fixtures/paid-route-control';
afterEach(() => vi.unstubAllGlobals());
test('activation is non-spending and records a move request before shared dispatch, then observes physical progress',() => {
  const f = fixture(); expect(f.control.activate(f.context,f.compiled,0).status).toBe('ready');
  expect(f.control.follow(f.context,f.creep,f.command)).toEqual({ status: 'running' });
  expect(f.control.follow(f.context,f.creep,f.command).status).toBe('blocked'); expect(f.follow).toHaveBeenCalledOnce();
  f.at(101,13); const current = f.control.observe(f.context);
  expect(current).toMatchObject({ status: 'ready',route: { cursor: { index: 1,observedAt: 101 },program: { activatedAt: 100 } } });
  const records = (f.root as { eldrift: { records: object } }).eldrift.records;
  expect(Object.keys(records)).toEqual(['remoteStartupRoutes/W0N1']);
});
test('stale activation, changed generation/topology, missing budget and unrequested drift defer without writes',() => {
  const f = fixture(); f.at(101,14);
  expect(f.control.activate(f.context,f.compiled,0)).toMatchObject({ status: 'deferred' }); expect(f.root).toEqual({});
  f.at(100,14); expect(f.control.activate(f.context,f.compiled,0).status).toBe('ready'); const before = JSON.stringify(f.root);
  f.topology('changed'); expect(f.control.observe(f.context)).toMatchObject({ reason: 'route-observation-binding' });
  f.topology('matrix-v1'); f.context.cohort.generation++;
  expect(f.control.observe(f.context)).toMatchObject({ reason: 'route-observation-binding' }); f.context.cohort.generation--;
  expect(f.control.observe(f.context,() => false)).toMatchObject({ reason: 'budget' });
  f.at(101,13); expect(f.control.observe(f.context)).toMatchObject({ reason: 'route-physical-deviation' });
  expect(JSON.stringify(f.root)).toBe(before);
  const saved = f.state.read('remoteStartupRoutes/W0N1') as { data: unknown };
  f.state.write('remoteStartupRoutes/W0N1',{ owner: 'remotes',version: 2,data: saved.data }); const future = JSON.stringify(f.root);
  expect(f.control.current(f.context)).toMatchObject({ reason: 'route-state' }); expect(JSON.stringify(f.root)).toBe(future);
});
