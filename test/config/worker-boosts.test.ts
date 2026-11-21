import { expect, test } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';
test('worker boosts default off, layer explicitly, and reject unsafe policy/timeouts',() => {
  expect(resolveConfig({},1).values.workerBoostPolicy).toBe('off');
  expect(resolveConfig({ empire: { workerBoostPolicy: 'optional' },roomOverride: { workerBoostPolicy: 'required',workerBoostTimeout: 80 } },1).values).toMatchObject({ workerBoostPolicy: 'required',workerBoostTimeout: 80 });
  for (const values of [{ workerBoostPolicy: 'always' },{ workerBoostTimeout: 0 },{ workerBoostTimeout: 1501 }]) expect(() => resolveConfig({ empire: values },1)).toThrow('invalid');
});

test('boosted builder recipe is explicit, defaults standard and requires a required contract policy',() => {
  expect(resolveConfig({},1).values.workerBuilderRecipe).toBe('standard');
  expect(resolveConfig({ empire: { workerBuilderRecipe: 'boosted',workerBoostPolicy: 'required' } },1).values.workerBuilderRecipe).toBe('boosted');
  for (const workerBoostPolicy of ['off','optional']) expect(() => resolveConfig({ empire: { workerBuilderRecipe: 'boosted',workerBoostPolicy } },1)).toThrow('requires required');
  expect(() => resolveConfig({ empire: { workerBuilderRecipe: 'huge' } },1)).toThrow('invalid');
});
