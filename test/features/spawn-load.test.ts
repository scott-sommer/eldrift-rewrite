import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createSpawnLoadStore } from '../../src/features/population/spawn-load/store';
import { sampleSpawnLoad, reportSpawnLoad } from '../../src/features/population/spawn-load/window';
import type { SpawnLoadSegment } from '../../src/features/population/spawn-load/model';
test('1500 busy or energy-starved observations count equally without counting a spawn twice',() => {
  let segments: SpawnLoadSegment[] = [];
  for (let tick = 1; tick <= 1500; tick++) segments = sampleSpawnLoad(segments,tick,{ busy: 1,starved: 1,spawns: 2 });
  expect(segments).toHaveLength(1);
  expect(reportSpawnLoad(segments,1500,2)).toEqual({ load: 1,coverage: 1,busyTicks: 1500,starvedTicks: 1500,spawnCount: 2 });
  expect(() => sampleSpawnLoad(segments,1501,{ busy: 2,starved: 1,spawns: 2 })).toThrow();
});
test('rolling window trims old pressure and leaves observation gaps explicit',() => {
  let segments = sampleSpawnLoad([],1,{ busy: 1,starved: 0,spawns: 1 });
  for (let tick = 3; tick <= 1501; tick++) segments = sampleSpawnLoad(segments,tick,{ busy: 0,starved: 0,spawns: 1 });
  expect(segments).toEqual([{ from: 3,to: 1502,busy: 0,starved: 0,spawns: 1 }]);
  expect(reportSpawnLoad(segments,1501,1)).toMatchObject({ load: 0,coverage: 1499/1500 });
  segments = sampleSpawnLoad(segments,1502,{ busy: 0,starved: 0,spawns: 1 });
  expect(reportSpawnLoad(segments,1502,1).coverage).toBe(1);
});
test('current capacity denominator is clamped after a spawn disappears',() => {
  const segments = [{ from: 1,to: 1501,busy: 3,starved: 0,spawns: 3 }];
  expect(reportSpawnLoad(segments,1500,1).load).toBe(1);
  expect(reportSpawnLoad(segments,1500,0).load).toBe(0);
});
test('alternating observations remain bounded and detached',() => {
  let segments: SpawnLoadSegment[] = [];
  for (let tick = 1; tick <= 3000; tick++) segments = sampleSpawnLoad(segments,tick,{ busy: tick%2,starved: 0,spawns: 1 });
  expect(segments).toHaveLength(1500); expect(segments[0]?.from).toBe(1501);
  expect(reportSpawnLoad(segments,3000,1)).toMatchObject({ load: .5,coverage: 1 });
  const before = structuredClone(segments);
  sampleSpawnLoad(segments,3001,{ busy: 0,starved: 0,spawns: 1 }); expect(segments).toEqual(before);
});
test('reload preserves history; duplicate and regressed samples never mutate state',() => {
  const root = {}, state = createMemoryPort(() => root), store = createSpawnLoadStore(state,'W0N1');
  expect(store.read().segments).toEqual([]); expect(root).toEqual({});
  expect(store.sample(10,{ busy: 0,starved: 1,spawns: 1 })).toBe(true);
  const before = JSON.stringify(root), reload = createSpawnLoadStore(state,'W0N1');
  expect(reload.sample(10,{ busy: 1,starved: 0,spawns: 1 })).toBe(false);
  expect(reload.sample(9,{ busy: 0,starved: 0,spawns: 1 })).toBe(false);
  reload.read().segments[0]!.starved = 0; expect(JSON.stringify(root)).toBe(before);
  expect(reload.report(10,1).starvedTicks).toBe(1);
  expect(createSpawnLoadStore(state,'W0N2').read().segments).toEqual([]);
});
test('corrupt overlapping history is rejected without reset',() => {
  const root = {}, state = createMemoryPort(() => root);
  state.write('spawnLoad/W0N1',{ owner: 'population',version: 1,data: { home: 'W0N1',revision: 2,clock: 2,segments: [
    { from: 1,to: 3,busy: 1,starved: 0,spawns: 1 },{ from: 2,to: 3,busy: 0,starved: 1,spawns: 1 }
  ] } });
  const before = JSON.stringify(root); expect(() => createSpawnLoadStore(state,'W0N1').read()).toThrow(); expect(JSON.stringify(root)).toBe(before);
});
