import { afterEach, expect, test, vi } from 'vitest';
import { recordNativeLaborReceipt, recordNativeLaborFailure, withLaborReceiptRetirement } from '../../src/app/native-labor/receipt';
import { laborProposalFixture } from '../fixtures/household-labor-proposal';
afterEach(() => vi.unstubAllGlobals());
test('native receipt survives JSON persistence and identity-scoped retirement preserves unrelated/replacement metadata',() => {
  const f = laborProposalFixture(), ready = f.propose(f.input); if (ready.status !== 'ready') throw new Error('Expected proposal');
  const assignment = { source: 'keep-source',position: { room: 'W0N1',x: 1,y: 1 } };
  const memory: CreepMemory = { workerSource: assignment }, creep = { id: 'old-unit',name: 'worker',memory,store: { energy: 0 } } as unknown as Creep;
  vi.stubGlobal('Game',{ time: 12 }); vi.stubGlobal('Memory',{ creeps: { worker: memory } });
  recordNativeLaborReceipt(creep,{ worker: creep.id,picked: 3,spent: 3,returned: 0,pending: null },{ proposal: ready.read() });
  recordNativeLaborFailure(creep,{ worker: creep.id,picked: 3,spent: 0,returned: 3,pending: null,failure: { reason: 'cancelled',tick: 11 } },{ proposal: ready.read() },'cancelled');
  const restored = JSON.parse(JSON.stringify(Memory)); vi.stubGlobal('Memory',restored);
  expect(restored.creeps.worker.startupLaborReceipt).toMatchObject({ request: 'worker',unit: 'old-unit',observedAt: 1,completedAt: 12,spent: 3 });
  const before = vi.fn(), retire = withLaborReceiptRetirement(before);
  retire({ name: 'worker',id: 'other-unit' }); expect(restored.creeps.worker.startupLaborReceipt).toBeDefined();
  retire({ name: 'worker',id: 'old-unit' }); expect(restored.creeps.worker).toEqual({ workerSource: assignment }); expect(before).toHaveBeenCalledTimes(2);
  restored.creeps.worker.startupLaborReceipt = { ...memory.startupLaborReceipt,unit: 'replacement' };
  retire({ name: 'worker',id: 'old-unit' }); expect(restored.creeps.worker.startupLaborReceipt.unit).toBe('replacement');
});
