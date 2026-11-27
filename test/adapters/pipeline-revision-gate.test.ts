import { expect,test } from 'vitest';
import { createPipelineRevisionGate } from '../engine/pipeline-revision-gate';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
test('passive observations detect every owner revision and reload without writes or financial reuse',() => {
  const root = {}, state = createMemoryPort(() => root), key = 'fixture/observed', changed = createPipelineRevisionGate(key,'fixture',1);
  expect(changed(state)).toBe(true); expect(changed(state)).toBe(false); expect(root).toEqual({});
  state.write(key,{ owner: 'fixture',version: 1,data: { revision: 1,clock: 10 } });
  const before = JSON.stringify(root); expect(changed(state)).toBe(true); expect(changed(state)).toBe(false); expect(JSON.stringify(root)).toBe(before);
  state.write(key,{ owner: 'fixture',version: 1,data: { revision: 2,clock: 10 } }); expect(changed(state)).toBe(true);
  expect(createPipelineRevisionGate(key,'fixture',1)(state)).toBe(true);
  state.write(key,{ owner: 'other',version: 1,data: { revision: 3,clock: 10 } }); expect(() => changed(state)).toThrow('owner/version');
  state.write(key,{ owner: 'fixture',version: 2,data: { revision: 3,clock: 10 } }); expect(() => changed(state)).toThrow('owner/version');
});
