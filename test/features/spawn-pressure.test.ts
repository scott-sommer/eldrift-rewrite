import { expect, test } from 'vitest';
import { measureSpawnPressure } from '../../src/features/population/spawn-load/pressure';
import type { SpawnPressureObservation } from '../../src/features/population/spawn-load/pressure';
import type { SpawnRequest } from '../../src/capabilities/spawning/request';
const request = (id: string,overrides: Partial<SpawnRequest> = {}): SpawnRequest => ({ id,owner: 'fixture',room: 'W0N1',name: id,priority: 1,readyAt: 1,expiresAt: 10,body: ['claim','move'],...overrides });
function view(overrides: Partial<SpawnPressureObservation> = {}): SpawnPressureObservation {
  return { room: 'W0N1',tick: 1,slots: [{ id: 'spawn',room: 'W0N1',busy: false }],energy: 300,capacity: 1300,names: new Set(),requests: [request('a')],...overrides };
}
test('allocator-skipped unaffordable ready demand counts as energy starvation',() => {
  expect(measureSpawnPressure(view())).toEqual({ busy: 0,starved: 1,spawns: 1 });
});
test('occupied spawns cannot also be starved; affordable unattempted demand is not occupancy',() => {
  expect(measureSpawnPressure(view({ slots: [{ id: 'spawn',room: 'W0N1',busy: true }] }))).toEqual({ busy: 1,starved: 0,spawns: 1 });
  expect(measureSpawnPressure(view({ energy: 650 }))).toEqual({ busy: 0,starved: 0,spawns: 1 });
});
test('unready, expired, born, foreign-room and impossible-body demand does not add pressure',() => {
  const requests = [request('future',{ readyAt: 2 }),request('expired',{ readyAt: 0,expiresAt: 1 }),request('born'),request('foreign',{ room: 'W0N2' }),request('impossible',{ body: ['claim','claim','claim'] })];
  expect(measureSpawnPressure(view({ requests,names: new Set(['born']) })).starved).toBe(0);
});
test('one queued request cannot starve several spawns',() => {
  const slots = ['a','b','c'].map(id => ({ id,room: 'W0N1',busy: false }));
  expect(measureSpawnPressure(view({ slots })).starved).toBe(1);
  expect(measureSpawnPressure(view({ slots,requests: [request('a'),request('b'),request('c'),request('d')] })).starved).toBe(3);
});
test('read-only proposal accounts for cheaper skip-policy demand and shared remaining energy',() => {
  const slots = ['a','b'].map(id => ({ id,room: 'W0N1',busy: false }));
  const observation = view({ slots,requests: [request('expensive'),request('cheap',{ body: ['move'] })],energy: 650 });
  expect(measureSpawnPressure(observation)).toEqual({ busy: 0,starved: 1,spawns: 2 });
  expect(observation.energy).toBe(650); expect(observation.requests[0]?.readyAt).toBe(1);
});
