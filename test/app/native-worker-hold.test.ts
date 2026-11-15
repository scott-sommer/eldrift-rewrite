import { afterEach, expect, test, vi } from 'vitest';
import { nativeWorkerHold } from '../../src/app/native-worker-hold';
import { defaults } from '../../src/config/model';
afterEach(() => vi.unstubAllGlobals());
test('Transfer marker hold follows current input and only affects the upgrader-v2 profile', () => {
  vi.stubGlobal('FIND_FLAGS', 110);
  let flags = [{ name: 'Transfer:test:W0N1' }];
  const room = { find: () => flags } as unknown as Room;
  const config = { ...defaults, workerEnergyProfile: 'upgrader-v2' as const };
  expect(nativeWorkerHold(room, config)).toBe(true);
  expect(nativeWorkerHold(room, { ...config, workerEnergyProfile: 'builder' })).toBe(false);
  flags = [];
  expect(nativeWorkerHold(room, config)).toBe(false);
  expect(nativeWorkerHold(room, { ...config, workerHoldStoragePosition: true })).toBe(true);
});

