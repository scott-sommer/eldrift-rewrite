import { afterEach, expect, test, vi } from 'vitest';
import { nativeScoutDepth } from '../../src/app/native-scout-policy';
import { defaults } from '../../src/config/model';
afterEach(() => vi.unstubAllGlobals());

test('room maturity selects configurable depth using RCL3 progress fraction rather than a hardcoded total', () => {
  const controller = { my: true, level: 3, progress: 13499, progressTotal: 135000 };
  vi.stubGlobal('Game',{ rooms: { W0N1: { controller } } });
  expect(nativeScoutDepth('W0N1',defaults)).toBe(2);
  controller.progress = 13500;
  expect(nativeScoutDepth('W0N1',defaults)).toBe(4);
  controller.progressTotal = 100000; controller.progress = 10000;
  expect(nativeScoutDepth('W0N1',defaults)).toBe(4);
  controller.level = 4;
  expect(nativeScoutDepth('W0N1',{ ...defaults, scoutExtendedDepth: 5 })).toBe(5);
});
