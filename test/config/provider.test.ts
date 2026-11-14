import { expect, test } from 'vitest';
import { configurationFor } from '../../src/config/provider';
import { resolveConfig } from '../../src/config/resolve';

test('room provider preserves shared layers and selects profile and temporary override', () => {
  const store = { environment: { minimumBucket: 5 }, empire: { allies: ['friend'] }, profiles: { quiet: { backgroundEnabled: false } }, rooms: { W1N1: { profile: 'quiet', override: { minimumBucket: 0 }, temporary: { expiresAt: 20, values: { backgroundEnabled: true } } } } };
  const config = resolveConfig(configurationFor(store, 'W1N1'), 10);
  expect(config.values).toMatchObject({ minimumBucket: 0, allies: ['friend'], backgroundEnabled: true });
  expect(config.sources.backgroundEnabled).toBe('temporary');
  expect(resolveConfig(configurationFor(store, 'W2N2'), 10).values.minimumBucket).toBe(5);
  expect(() => configurationFor({ rooms: { bad: { profile: 'missing' } } }, 'bad')).toThrow('Unknown room profile');
});
