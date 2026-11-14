import { expect, test } from 'vitest';
import { missionSchema } from '../../src/features/missions/state';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
const contracts = { rally: { validOptions: (value: unknown) => typeof value === 'string', validCriteria: (value: unknown) => typeof value === 'number' } };

test('mission stage order, progress and unit assignments survive reset', () => {
  let memory = {};
  const schema = missionSchema('mission-a', contracts);
  const port = createMemoryPort(() => memory);
  const state = openState(port, 'missions/mission-a', schema);
  state.status = 'active'; state.units = ['unit-a'];
  state.stages = [{ kind: 'rally', options: 'W1N1', criteria: 2 }, { kind: 'rally', options: 'W2N2', criteria: 1 }];
  state.stageIndex = 1;
  saveState(port, 'missions/mission-a', schema, state);
  memory = JSON.parse(JSON.stringify(memory));
  expect(openState(createMemoryPort(() => memory), 'missions/mission-a', schema)).toEqual(state);
});

test('invalid progress, unknown stages and duplicate units are rejected', () => {
  const schema = missionSchema('mission-a', contracts);
  const initial = schema.initial();
  expect(schema.valid({ ...initial, status: 'active' })).toBe(false);
  expect(schema.valid({ ...initial, units: ['a', 'a'] })).toBe(false);
  expect(schema.valid({ ...initial, stages: [{ kind: 'unknown', options: null, criteria: null }] })).toBe(false);
  expect(schema.valid({ ...initial, stageIndex: -1 })).toBe(false);
});
