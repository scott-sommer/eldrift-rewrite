import { expect, test, vi } from 'vitest';
import { sampledGuard } from '../../src/core/sampled-guard';
test('sampled admission checks first and latches refusal with a bounded observation interval', () => {
  const source = vi.fn().mockReturnValueOnce(true).mockReturnValue(false), guard = sampledGuard(source, 32);
  for (let scan = 0; scan < 32; scan++) expect(guard()).toBe(true);
  expect(source).toHaveBeenCalledTimes(1);
  expect(guard()).toBe(false);
  expect(guard()).toBe(false);
  expect(source).toHaveBeenCalledTimes(2);
  const denied = vi.fn(() => false);
  expect(sampledGuard(denied, 32)()).toBe(false);
  expect(denied).toHaveBeenCalledTimes(1);
});
test('invalid sampling intervals cannot remove the finite observation bound', () => {
  for (const interval of [0, -1, 1.5, 1025, Infinity]) expect(() => sampledGuard(() => true, interval)).toThrow('interval');
});
