import { expect, test } from 'vitest';
import { operatorSchema } from '../../src/features/operator/state';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { openState, saveState } from '../../src/persistence/versioned-state';
import { configurationFor } from '../../src/config/provider';
import { resolveConfig } from '../../src/config/resolve';

test('persisted profiles and temporary overrides resolve correctly after reset', () => {
  let memory = {};
  const port = createMemoryPort(() => memory);
  openState(port, 'operator/config', operatorSchema);
  saveState(port, 'operator/config', operatorSchema, { empire: { minimumBucket: 500 }, profiles: { quiet: { backgroundEnabled: false } }, rooms: { W1N1: { profile: 'quiet', temporary: { expiresAt: 10, values: { minimumBucket: 0 } } } } });
  memory = JSON.parse(JSON.stringify(memory));
  const store = openState(createMemoryPort(() => memory), 'operator/config', operatorSchema);
  expect(resolveConfig(configurationFor(store, 'W1N1'), 9).values).toMatchObject({ minimumBucket: 0, backgroundEnabled: false });
  expect(resolveConfig(configurationFor(store, 'W1N1'), 10).values.minimumBucket).toBe(500);
});

test.each([{ unknown: 1 }, { profiles: [] }, { rooms: { W1N1: { profile: 'missing' } } }, { profiles: { unused: { badKey: true } } }, { rooms: { W1N1: { invalid: 1 } } }])('invalid operator configuration is rejected', value => {
  expect(operatorSchema.valid(value)).toBe(false);
});
