import { expect, test } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';
test('worker boosts default off, layer explicitly, and reject unsafe policy/timeouts',() => {
  expect(resolveConfig({},1).values.workerBoostPolicy).toBe('off');
  expect(resolveConfig({ empire: { workerBoostPolicy: 'optional' },roomOverride: { workerBoostPolicy: 'required',workerBoostTimeout: 80 } },1).values).toMatchObject({ workerBoostPolicy: 'required',workerBoostTimeout: 80 });
  for (const values of [{ workerBoostPolicy: 'always' },{ workerBoostTimeout: 0 },{ workerBoostTimeout: 1501 }]) expect(() => resolveConfig({ empire: values },1)).toThrow('invalid');
});
