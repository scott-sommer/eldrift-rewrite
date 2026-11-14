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

 test('link thresholds use ordinary configuration precedence and reject invalid values', () => {
  const resolved = resolveConfig({ empire: { linkControllerTrigger: 0.75, linkRelayTrigger: 500 }, roomOverride: { linkControllerTrigger: 0, linkStorageAssistTrigger: 0.25 } }, 1);
  expect(resolved.values.linkControllerTrigger).toBe(0);
  expect(resolved.sources.linkControllerTrigger).toBe('roomOverride');
  expect(resolved.values.linkStorageAssistTrigger).toBe(0.25);
  expect(resolved.values.linkRelayTrigger).toBe(500);
  for (const patch of [{ linkControllerTrigger: 1.1 }, { linkStorageAssistTrigger: -1 }, { linkRelayTrigger: 801 }, { linkRelayTrigger: 0.5 }]) {
    expect(() => resolveConfig({ empire: patch }, 1)).toThrow();
  }
});

test('worker energy strategy and position hold are independently configurable', () => {
  const config = resolveConfig({ empire: { workerEnergyProfile: 'builder' }, roomOverride: {
    workerEnergyProfile: 'upgrader-v2', workerHoldStoragePosition: true, workerEnergyStorageReserve: 0,
  } }, 1);
  expect(config.values.workerEnergyProfile).toBe('upgrader-v2');
  expect(config.values.workerHoldStoragePosition).toBe(true);
  expect(config.values.workerEnergyStorageReserve).toBe(0);
  for (const patch of [{ workerEnergyProfile: 'missing' }, { workerHoldStoragePosition: 1 }]) {
    expect(() => resolveConfig({ empire: patch }, 1)).toThrow();
  }
});

test('recovery configuration validates the combined entry and exit thresholds across layers', () => {
  expect(resolveConfig({ empire: { recoveryEnabled: true }, roomOverride: { recoveryInterval: 1 } }, 1).values.recoveryInterval).toBe(1);
  for (const patch of [{ recoveryInterval: 0 }, { recoverySupportBatch: 0 }, { recoveryDonorMaximumDistance: -1 }]) {
    expect(() => resolveConfig({ empire: patch }, 1)).toThrow();
  }
  expect(() => resolveConfig({ empire: { recoveryEnterEnergy: 20000 }, roomOverride: { recoveryExitEnergy: 20000 } }, 1)).toThrow('entry');
});
