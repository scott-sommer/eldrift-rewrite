import { expect, test, vi } from 'vitest';
import { createPathFollowing } from '../../src/capabilities/movement/path-following';
import { createNavigator } from '../../src/capabilities/movement/navigator';
import { createPathService } from '../../src/capabilities/movement/path-service';
import type { PathRequest, PathResult } from '../../src/capabilities/movement/path-model';
const origin = { room: 'W0N1',x: 10,y: 10 }, destination = { ...origin,x: 13 };
const request: PathRequest = { origin,destination,range: 0,profile: { id: 'unit',plainCost: 1,swampCost: 5,maxOps: 100,maxRooms: 1 },
  topologyVersion: 'one',policyVersion: 'safe',allowedRooms: ['W0N1'] };
const result: PathResult = { status: 'complete',path: [11,12,13].map(x => ({ ...origin,x })),cost: 3,operations: 3 };
test('navigation follows actual progress with one search while preparing current context at every step',() => {
  let tick = 1; const search = vi.fn(() => result), prepare = vi.fn((view: { position: typeof origin }) => ({ ...request,origin: view.position }));
  const navigate = createNavigator({ paths: createPathService(search,() => tick),request: prepare,direction: (from,to) => { expect(to.x).toBe(from.x+1); return 3; },
    move: () => ({ status: 'issued',code: 0 }),rejected: () => ({ status: 'failed',reason: 'rejected' }) });
  for (const x of [10,11,12]) {
    expect(navigate('unit',{ tick,position: { ...origin,x },destination,range: 0,fatigue: 0,allowPartial: false }).status).toBe('running'); tick++;
  }
  expect(search).toHaveBeenCalledTimes(1); expect(prepare).toHaveBeenCalledTimes(3);
  expect(navigate('unit',{ tick,position: destination,destination,range: 0,fatigue: 0,allowPartial: false })).toEqual({ status: 'done' });
});
test('context changes and unexpected displacement cannot reuse a retained path',() => {
  const paths = createPathFollowing();
  const variants = [{ ...request,topologyVersion: 'changed' },{ ...request,policyVersion: 'unsafe' },
    { ...request,profile: { ...request.profile,plainCost: 2 } },{ ...request,allowedRooms: ['E0N1'] },
    { ...request,range: 1 },{ ...request,destination: { ...destination,y: 11 } },{ ...request,origin: { ...origin,y: 20 } }];
  for (const changed of variants) { paths.remember('unit',request,result,1); expect(paths.next('unit',changed,2)).toBeUndefined(); }
  paths.remember('unit',request,result,1);
  expect(paths.next('unit',{ ...request,origin: { ...origin,x: 11 } },2)).toEqual({ ...origin,x: 12 });
});
test('followed paths isolate mutations, expire, evict, and never retain incomplete or oversized searches',() => {
  const paths = createPathFollowing(1,3,3), input = structuredClone(result);
  paths.remember('unit',request,input,1); input.path[0]!.x = 49;
  const first = paths.next('unit',request,2)!; first.x = 48;
  expect(paths.next('unit',request,2)).toEqual({ ...origin,x: 11 }); expect(paths.next('unit',request,4)).toBeUndefined();
  paths.remember('unit',request,result,5); paths.remember('other',request,result,5); expect(paths.next('unit',request,5)).toBeUndefined();
  paths.remember('other',request,{ status: 'incomplete',path: [{ ...origin,x: 11 }],cost: 1,operations: 100 },5);
  expect(paths.next('other',request,5)).toBeUndefined();
  paths.remember('other',request,{ status: 'complete',path: [11,12,13,14].map(x => ({ ...origin,x })),cost: 4,operations: 4 },5);
  expect(paths.next('other',request,5)).toBeUndefined();
  expect(createPathFollowing().next('unit',request,5)).toBeUndefined();
  expect(() => paths.next('other',{ ...request,origin: { ...origin,x: -1 } },5)).toThrow('endpoints');
});
