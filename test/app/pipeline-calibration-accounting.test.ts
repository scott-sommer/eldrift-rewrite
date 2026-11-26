import { afterEach, expect, test, vi } from 'vitest';
import { recordCalibrationCall } from '../engine/pipeline-cohort-calibration';
afterEach(() => vi.unstubAllGlobals());
test('source harvest counts overflow as extraction, independently of available carry capacity',() => {
  const events: unknown[] = [];
  vi.stubGlobal('Memory',{ pipelineCalibration: { quote: { observedAt: 10 },horizon: 20,events } });
  vi.stubGlobal('Game',{ time: 11 }); vi.stubGlobal('WORK','work'); vi.stubGlobal('HARVEST_POWER',2);
  const creep = { name: 'miner',getActiveBodyparts: () => 4,store: { getFreeCapacity: () => 2 } } as unknown as Creep;
  recordCalibrationCall(creep,'harvest',{ energy: 100 });
  recordCalibrationCall(creep,'harvest',{ energy: 3 });
  expect(events).toEqual([{ tick: 11,actor: 'miner',action: 'harvest',amount: 8 },{ tick: 11,actor: 'miner',action: 'harvest',amount: 3 }]);
});
