import { expect, test } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';
test('lab settings inherit and room overrides isolate production and reserved labs',() => {
  const result = resolveConfig({ empire: { labReactionsEnabled: true,labReactionProduct: 'OH' },roomOverride: { labTransportEnabled: false,labTransportBatch: 50,labReactionTarget: 25,labReagentReserve: 5,labReservedIds: ['boost'] } },1);
  expect(result.values.labReactionProduct).toBe('OH'); expect(result.values.labReactionTarget).toBe(25);
  expect(result.values.labTransportEnabled).toBe(false); expect(result.values.labTransportBatch).toBe(50);
  expect(result.sources.labReactionTarget).toBe('roomOverride'); expect(resolveConfig({},1).values.labReactionsEnabled).toBe(false);
});
test.each([{ labTransportBatch: 0 },{ labReactionTarget: -1 },{ labReagentReserve: 0.5 },{ labReservedIds: ['same','same'] },{ labReactionProduct: '../bad' }])('invalid lab configuration is rejected (%j)',patch => {
  expect(() => resolveConfig({ empire: patch },1)).toThrow('invalid');
});
