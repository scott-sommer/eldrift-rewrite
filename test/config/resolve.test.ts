import { expect, test } from 'vitest';
import { resolveConfig } from '../../src/config/resolve';

test('configuration layers override in order and preserve false and zero with provenance', () => {
  const config = resolveConfig({ environment: { minimumBucket: 200 }, empire: { minimumBucket: 300 }, roomProfile: { minimumBucket: 400 }, roomOverride: { minimumBucket: 0, backgroundEnabled: false }, temporary: { expiresAt: 11, values: { layoutStrategy: 'stamps' } } }, 10);
  expect(config.values.minimumBucket).toBe(0);
  expect(config.values.backgroundEnabled).toBe(false);
  expect(config.sources.minimumBucket).toBe('roomOverride');
  expect(config.sources.layoutStrategy).toBe('temporary');
  expect(config.sources.allies).toBe('defaults');
});

test('temporary override expires exactly at its deadline', () => {
  const input = { empire: { minimumBucket: 500 }, temporary: { expiresAt: 10, values: { minimumBucket: 0 } } };
  expect(resolveConfig(input, 9).values.minimumBucket).toBe(0);
  expect(resolveConfig(input, 10).values.minimumBucket).toBe(500);
});

test.each([{ unknown: true }, { minimumBucket: NaN }, { minimumBucket: 0.5 }, { backgroundCpuFraction: 1.1 }, { backgroundEnabled: 0 }, { layoutStrategy: 'missing' }, { allies: [''] }, null, []])('invalid configuration is rejected with layer context', patch => {
  expect(() => resolveConfig({ roomOverride: patch }, 1)).toThrow(/roomOverride/);
});

test('resolved configuration is isolated between rooms and from caller mutation', () => {
  const allies = ['friend'];
  const first = resolveConfig({ roomOverride: { allies, minimumBucket: 0 } }, 1);
  allies.push('later');
  expect(first.values.allies).toEqual(['friend']);
  expect(resolveConfig({}, 1).values.minimumBucket).toBe(1000);
  expect(Object.isFrozen(first.values)).toBe(true);
  expect(Object.isFrozen(first.values.allies)).toBe(true);
});
