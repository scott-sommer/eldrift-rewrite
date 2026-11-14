import { expect, test } from 'vitest';
import { createPersistentConfiguration } from '../../src/app/persistent-configuration';
import { createMemoryPort } from '../../src/adapters/screeps/memory';
import { saveState } from '../../src/persistence/versioned-state';
import { operatorSchema } from '../../src/features/operator/state';
import { resolveConfig } from '../../src/config/resolve';

test('configuration uses one durable snapshot per tick and refreshes on the next tick or reset', () => {
  let memory = {};
  let tick = 1;
  const port = createMemoryPort(() => memory);
  let provider = createPersistentConfiguration(port, () => tick);
  expect(resolveConfig(provider('W1N1'), tick).values.minimumBucket).toBe(1000);
  saveState(port, 'operator/config', operatorSchema, { empire: { minimumBucket: 200 }, rooms: { W1N1: { override: { minimumBucket: 0 } } } });
  expect(resolveConfig(provider('W1N1'), tick).values.minimumBucket).toBe(1000);
  tick++;
  expect(resolveConfig(provider('W1N1'), tick).values.minimumBucket).toBe(0);
  expect(resolveConfig(provider('W2N2'), tick).values.minimumBucket).toBe(200);
  memory = JSON.parse(JSON.stringify(memory));
  provider = createPersistentConfiguration(createMemoryPort(() => memory), () => tick);
  expect(resolveConfig(provider('W1N1'), tick).values.minimumBucket).toBe(0);
});
