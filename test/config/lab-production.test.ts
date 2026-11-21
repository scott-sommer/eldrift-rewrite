import { expect, test } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';
test('production records are copied and deeply frozen across layered configuration',() => {
  const targets = [{ product: 'UH2O',amount: 10,priority: 0 }];
  const result = resolveConfig({ empire: { labProductionTargets: targets },roomOverride: { labProductionBatch: 50 } },1);
  targets[0]!.amount = 100;
  expect(result.values.labProductionTargets[0]!.amount).toBe(10);
  expect(Object.isFrozen(result.values.labProductionTargets[0])).toBe(true);
  const reordered = resolveConfig({ empire: { labProductionTargets: [{ priority: 0,amount: 10,product: 'UH2O' }] } },1);
  expect(JSON.stringify(reordered.values.labProductionTargets)).toBe(JSON.stringify(result.values.labProductionTargets));
  expect(result.values.labProductionBatch).toBe(50); expect(resolveConfig({},1).values.labProductionTargets).toEqual([]);
});
test.each([
  { labProductionTargets: [{ product: 'OH',amount: -1,priority: 0 }] },
  { labProductionTargets: [{ product: 'OH',amount: 10,priority: 0,extra: true }] },
  { labProductionTargets: [{ product: 'OH',amount: 10,priority: 0 },{ product: 'OH',amount: 20,priority: 1 }] },
  { labProductionBatch: 4 },
  { labProductionScope: 'global' },
])('invalid production configuration is refused (%j)',patch => { expect(() => resolveConfig({ empire: patch },1)).toThrow('invalid'); });

test('room production remains default and empire participation can be overridden per room',() => {
  expect(resolveConfig({},1).values.labProductionScope).toBe('room');
  expect(resolveConfig({ empire: { labProductionScope: 'empire' },roomOverride: { labProductionScope: 'room' } },1).values.labProductionScope).toBe('room');
});

test('threshold policy permits separate duplicate thresholds and snapshots them without weakening ordinary targets',() => {
  const thresholds = [{ product: 'OH',amount: 10,priority: 0 },{ product: 'OH',amount: 20,priority: 2 }];
  const config = resolveConfig({ empire: { labProductionPolicy: 'thresholds',labProductionThresholds: thresholds,labIntermediateBase: 10,labIntermediatePerTerminal: 5 } },1);
  thresholds[0]!.amount = 100; expect(config.values.labProductionThresholds[0]!.amount).toBe(10); expect(Object.isFrozen(config.values.labProductionThresholds[0])).toBe(true);
  expect(() => resolveConfig({ empire: { labProductionTargets: config.values.labProductionThresholds } },1)).toThrow('invalid');
  for (const patch of [{ labProductionPolicy: 'unknown' },{ labIntermediateBase: -1 },{ labIntermediatePerTerminal: 0.5 }]) expect(() => resolveConfig({ empire: patch },1)).toThrow('invalid');
});
