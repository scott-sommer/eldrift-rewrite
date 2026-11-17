import { expect, test } from 'vitest';
import { createRecoverableFlow } from '../../src/core/recoverable-flow';
const edges = [{ from: 0, to: 1, capacity: 2 }, { from: 1, to: 3, capacity: 2 },
  { from: 0, to: 2, capacity: 3 }, { from: 2, to: 3, capacity: 3 }];
test('serialized checkpoints reconstruct across bounded replay slices before continuing flow', () => {
  const original = createRecoverableFlow(4, edges, 0, 3), first = original.advance(1);
  expect(first.flow).toBe(2);
  const checkpoint = JSON.parse(JSON.stringify(first.checkpoint)), before = JSON.stringify(checkpoint);
  const restored = createRecoverableFlow(4, edges, 0, 3, checkpoint);
  let result = restored.advance(1, () => true, 1);
  for (let call = 0; !result.done && call < 100; call++) {
    expect(result.scans).toBeLessThanOrEqual(1);
    result = restored.advance(1, () => true, 1);
  }
  expect(result.done).toBe(true);
  expect(result.flow).toBe(5);
  expect(result.checkpoint.augmentations).toBe(2);
  expect(JSON.stringify(checkpoint)).toBe(before);
});
test('graph identity and impossible replay counters fail explicitly', () => {
  const checkpoint = createRecoverableFlow(4, edges, 0, 3).advance(1).checkpoint;
  expect(() => createRecoverableFlow(4, [...edges].reverse(), 0, 3, checkpoint)).toThrow('Stale');
  expect(() => createRecoverableFlow(4, edges, 0, 3, { ...checkpoint, augmentations: -1 })).toThrow('Invalid');
  const impossible = createRecoverableFlow(4, edges, 0, 3, { ...checkpoint, augmentations: 10 });
  expect(() => impossible.advance(100)).toThrow('Unreachable');
});
