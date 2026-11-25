import { expect, test } from 'vitest';
import { peekTaskHead } from '../../src/persistence/tasks/head';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
function fixture() { const root = {},state = createMemoryPort(() => root); return { root,state }; }
test('task metadata reads are detached and do not initialize or interpret feature payloads',() => {
  const f = fixture(); expect(peekTaskHead(f.state,'worker')).toBeUndefined(); expect(f.root).toEqual({});
  f.state.write('tasks/worker',{ owner: 'tasks',version: 2,data: { unit: 'worker',queue: [{ id: 'a',kind: 'foreign-feature',phase: 'opaque',payload: { custom: [1,2] },wakeAt: 0,retries: 0,expiresAt: 100 }] } });
  const before = JSON.stringify(f.root), head = peekTaskHead(f.state,'worker')!; expect(head.kind).toBe('foreign-feature'); expect(head).not.toHaveProperty('payload');
  head.kind = 'changed'; expect(JSON.stringify(f.root)).toBe(before);
});
test('legacy metadata migrates only in detached reads while foreign/future/corrupt headers refuse',() => {
  const f = fixture(); f.state.write('tasks/worker',{ owner: 'tasks',version: 1,data: { unit: 'worker',queue: [{ id: 'a',kind: 'legacy',phase: 'work',payload: null,wakeAt: 0 }] } });
  const before = JSON.stringify(f.root); expect(peekTaskHead(f.state,'worker')).toMatchObject({ retries: 0,expiresAt: Number.MAX_SAFE_INTEGER }); expect(JSON.stringify(f.root)).toBe(before);
  for (const envelope of [{ owner: 'other',version: 2,data: {} },{ owner: 'tasks',version: 3,data: {} },{ owner: 'tasks',version: 2,data: { unit: 'worker',queue: [{}] } }]) {
    f.state.write('tasks/worker',envelope); const saved = JSON.stringify(f.root); expect(() => peekTaskHead(f.state,'worker')).toThrow(); expect(JSON.stringify(f.root)).toBe(saved);
  }
});
