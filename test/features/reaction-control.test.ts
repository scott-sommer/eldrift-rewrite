import { expect, test } from 'vitest';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { createReactionControl, reactionsPaused } from '../../src/features/industry/reaction-control';
test('global pause is absent-safe, durable and idempotent without modifying room overrides or industry jobs',() => {
  let memory = {}; const state = createMemoryPort(() => memory), api = createReactionControl(state);
  expect(api.reactionsStatus()).toEqual({ paused: false }); expect(api.setReactionsPaused(false).changed).toBe(false); expect(memory).toEqual({});
  state.write('unrelated/test',{ owner: 'test',version: 1,data: { keep: true } });
  expect(api.setReactionsPaused(true)).toEqual({ changed: true,paused: true }); memory = JSON.parse(JSON.stringify(memory));
  expect(reactionsPaused(state)).toBe(true); const before = JSON.stringify(memory);
  expect(api.setReactionsPaused(true).changed).toBe(false); expect(JSON.stringify(memory)).toBe(before);
  expect(api.setReactionsPaused(false)).toEqual({ changed: true,paused: false }); expect(state.read('unrelated/test')).toMatchObject({ data: { keep: true } });
});
test('invalid command and foreign/future/corrupt control states refuse without a partial write',() => {
  const memory = {}, state = createMemoryPort(() => memory), api = createReactionControl(state);
  expect(() => api.setReactionsPaused('false' as never)).toThrow(); expect(memory).toEqual({});
  for (const envelope of [{ owner: 'other',version: 1,data: { paused: true } },{ owner: 'industry',version: 2,data: { paused: true } },{ owner: 'industry',version: 1,data: { paused: 'true' } }]) {
    state.write('industry-reaction-control/empire',envelope); const before = JSON.stringify(memory);
    expect(() => api.setReactionsPaused(false)).toThrow(); expect(JSON.stringify(memory)).toBe(before);
  }
});
