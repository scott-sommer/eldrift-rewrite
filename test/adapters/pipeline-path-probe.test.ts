import { afterEach, expect, test, vi } from 'vitest';
import { observePathActor, withPipelinePathProbe } from '../engine/pipeline-path-probe';
import type { PathProbeMemory } from '../engine/pipeline-path-probe';
afterEach(() => vi.unstubAllGlobals());
function fixture(search: (value: number) => { path: number[] } = () => ({ path: [] })) {
  let clock = 0;
  const memory: Pick<PathProbeMemory,'pipelineConfiguredPathProbeMode' | 'pipelinePathProbe'> = { pipelineConfiguredPathProbeMode: true };
  const values = ['unchanged'];
  class NativeRoom { name = 'room'; find(value: number) { expect(this.name).toBe('room'); expect(value).toBe(1); return values; } }
  const finder = { search };
  vi.stubGlobal('Memory',memory); vi.stubGlobal('Game',{ time: 311,cpu: { getUsed: () => clock++ } });
  vi.stubGlobal('Room',NativeRoom); vi.stubGlobal('PathFinder',finder);
  return { memory,values,NativeRoom,finder };
}
test('SDK measurement preserves arguments, receivers, object identity and original methods',() => {
  const result = { path: [1] }, f = fixture(value => { expect(value).toBe(7); return result; });
  const search = f.finder.search, find = f.NativeRoom.prototype.find;
  withPipelinePathProbe(() => {
    observePathActor('actor:unit:begin');
    expect(new f.NativeRoom().find(1)).toBe(f.values); expect(f.finder.search(7)).toBe(result);
    observePathActor('actor:unit:done');
  });
  expect(f.finder.search).toBe(search); expect(f.NativeRoom.prototype.find).toBe(find);
  expect(Object.values(f.memory.pipelinePathProbe!.rows).map(row => [row.actor,row.operation,row.window,row.calls,row.totalCpu]))
    .toEqual([['unit','find:1','reload:311',1,1],['unit','search','reload:311',1,1]]);
});
test('throwing SDK calls retain the exact error and restore hooks',() => {
  const error = new Error('native failure'), f = fixture(() => { throw error; }), original = f.finder.search, find = f.NativeRoom.prototype.find;
  expect(() => withPipelinePathProbe(() => f.finder.search(7))).toThrow(error);
  expect(f.finder.search).toBe(original); expect(f.NativeRoom.prototype.find).toBe(find);
  expect(Object.values(f.memory.pipelinePathProbe!.rows)[0]!.calls).toBe(1);
});
test('operation aggregation has a fixed key bound and disabled probes create no metrics',() => {
  const f = fixture(); f.memory.pipelineConfiguredPathProbeMode = false;
  withPipelinePathProbe(() => f.finder.search(1)); expect(f.memory.pipelinePathProbe).toBeUndefined();
  f.memory.pipelineConfiguredPathProbeMode = true;
  withPipelinePathProbe(() => { for (let index = 0; index < 300; index++) { observePathActor('actor:unit'+index+':begin'); f.finder.search(1); } });
  expect(Object.keys(f.memory.pipelinePathProbe!.rows)).toHaveLength(256); expect(f.memory.pipelinePathProbe!.droppedCalls).toBe(44);
});
