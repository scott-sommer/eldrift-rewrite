import { createActionArbiter } from '../../../src/core/execution/action-arbiter';
import { expect, test, vi } from 'vitest';
import { paidHaulingStateFixture } from '../../fixtures/paid-hauling-state';
import { createPaidHaulingForecastState } from '../../../src/app/remotes/startup/hauling-state/seed';
import { createPaidHaulingForecastService } from '../../../src/app/remotes/startup/hauling-state/service';
import { createForecastHaulingTransfer } from '../../../src/app/remotes/startup/hauling-state/transfer';
import { createEnergyInventoryFrame } from '../../../src/capabilities/resources/energy-inventory/frame';
import { createTransferJournal } from '../../../src/features/logistics/transfer-journal';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
const store = (id: string,energy: number,capacity = 100) => ({ id,energy,capacity,usedCapacity: energy,freeEnergyCapacity: capacity-energy });
function fixture() {
  const f = paidHaulingStateFixture('withdraw',50,100), seed = createPaidHaulingForecastState('W0N1',11,[f.courier],f.claims);
  const inventory = createEnergyInventoryFrame(11,[store('native',50),store('container',100,200),store('bank',0,75),store('outside',30)]);
  let inRange = true, accepting = true;
  const approach = vi.fn(() => ({ status: 'running' as const }));
  const arbiter = createActionArbiter(inventory.tick);
  const transfer = createForecastHaulingTransfer(seed.state,inventory,arbiter,{ position: () => ({ room: 'W0N1',x: 10,y: 25 }),
    target: () => ({ status: 'visible',inRange,accepting }),approach,capacityPool: target => logisticsPool('capacity',target) });
  const service = createPaidHaulingForecastService(seed,{ ...transfer,recruit: () => undefined,refused: () => {},prepare: () => true,authorized: () => true });
  return { f,seed,inventory,transfer,service,approach,arbiter,atRange(value: boolean) { inRange = value; },accept(value: boolean) { accepting = value; } };
}

test('the actual service journals before queueing and confirms only the next-frame clipped effect', () => {
  const s = fixture(),before = JSON.stringify(s.f); s.inventory.begin(11);
  expect(s.service.step(11,[{ name: 'courier',work: true }])).toMatchObject([{ outcome: { status: 'running' } }]);
  const attempt = createTransferJournal(s.seed.state,'native').read().attempt!;
  expect(attempt).toMatchObject({ kind: 'transfer',amount: 50,cargoBefore: 50,tick: 11 });
  expect(s.inventory.observe('native')!.energy).toBe(50); expect(s.inventory.observe('bank')!.energy).toBe(0);
  s.inventory.queue({ id: 'outside',kind: 'transfer',source: 'outside',target: 'bank',amount: 30 });
  expect(s.inventory.finish(['outside',attempt.id]).map(effect => effect.amount)).toEqual([30,45]);
  s.inventory.begin(12);
  expect(s.inventory.observe('native')!.energy).toBe(5);
  expect(s.service.step(12,[{ name: 'courier',work: true }])).toMatchObject([{ outcome: { status: 'failed',reason: 'orphaned-hauling-cargo' } }]);
  expect(s.seed.state.read('logistics-requests/W0N1')).toMatchObject({ data: { records: [{ receipts: [{ id: attempt.id,amount: 45 }] }] } });
  expect(createTransferJournal(s.seed.state,'native').read()).toMatchObject({ acknowledged: true,result: { status: 'observed',amount: 45 } });
  expect(JSON.stringify(s.f)).toBe(before);
});

test('approach cannot issue a transfer or change physical cargo; nonaccepting capacity cannot authorize delivery', () => {
  const s = fixture(); s.atRange(false); s.inventory.begin(11);
  s.service.step(11,[{ name: 'courier',work: true }]); expect(s.approach).toHaveBeenCalledOnce();
  expect(createTransferJournal(s.seed.state,'native').read().attempt!.tick).toBe(10);
  expect(s.inventory.finish([])).toEqual([]);
  s.inventory.begin(12); s.atRange(true); s.accept(false);
  expect(s.service.step(12,[{ name: 'courier',work: true }])).toMatchObject([{ outcome: { status: 'failed',reason: 'orphaned-hauling-cargo' } }]);
  expect(s.inventory.observe('native')!.energy).toBe(50); expect(s.inventory.finish([])).toEqual([]);
});

test('unfinished work reuses its request across loads and only settled deliveries become receipts', () => {
  const s = fixture(), visits = [{ name: 'courier',work: true }];
  const attempt = () => createTransferJournal(s.seed.state,'native').read().attempt!;
  s.inventory.begin(11); s.service.step(11,visits); const first = attempt();
  expect(s.inventory.finish([first.id])[0]!.amount).toBe(50);
  s.inventory.begin(12); s.service.step(12,visits); const pickup = attempt();
  expect(pickup).toMatchObject({ kind: 'withdraw',amount: 15 });
  expect(s.inventory.finish([pickup.id])[0]!.amount).toBe(15);
  s.inventory.begin(13); s.service.step(13,visits); const last = attempt();
  expect(last).toMatchObject({ kind: 'transfer',amount: 15 });
  s.inventory.finish([last.id]); s.inventory.begin(14); s.service.step(14,visits);
  expect(s.seed.state.read('logistics-requests/W0N1')).toMatchObject({ data: { records: [{ receipts: [{ id: first.id,amount: 50 },{ id: last.id,amount: 15 }] }] } });
  expect(s.inventory.observe('bank')!.energy).toBe(65); expect(s.inventory.observe('native')!.energy).toBe(0);
  expect(s.inventory.observe('container')!.energy).toBe(85); expect(s.inventory.finish([])).toEqual([]);
  expect(s.inventory.snapshot().reduce((total,stock) => total+stock.energy,0)).toBe(180);
});

test('a different world action owner blocks hauling without a physical transfer effect', () => {
  const s = fixture(); s.inventory.begin(11); expect(s.arbiter.claim('courier','other-owner')).toBe(true);
  s.service.step(11,[{ name: 'courier',work: true }]);
  expect(createTransferJournal(s.seed.state,'native').read()).toMatchObject({ acknowledged: false,attempt: { tick: 11,amount: 50 } });
  expect(s.inventory.observe('native')!.energy).toBe(50); expect(s.inventory.finish([])).toEqual([]);
  s.inventory.begin(12); s.service.step(12,[{ name: 'courier',work: true }]);
  const attempt = createTransferJournal(s.seed.state,'native').read().attempt!;
  expect(attempt.tick).toBe(12); expect(s.inventory.finish([attempt.id])[0]!.amount).toBe(50);
});

test('fleet settlement captures an unvisited courier delivery before its event window is lost', () => {
  const s = fixture(); s.inventory.begin(11); s.service.step(11,[{ name: 'courier',work: true }]);
  const delivered = createTransferJournal(s.seed.state,'native').read().attempt!;
  s.inventory.finish([delivered.id]); s.inventory.begin(12);
  expect(s.service.step(12,[])).toEqual([]); expect(s.inventory.pending()).toEqual([]);
  expect(createTransferJournal(s.seed.state,'native').read()).toMatchObject({ acknowledged: true,result: { status: 'observed',amount: 50 } });
  expect(s.seed.state.read('logistics-requests/W0N1')).toMatchObject({ data: { records: [{ receipts: [{ id: delivered.id,amount: 50 }] }] } });
  expect(s.seed.state.read('tasks/courier')).toMatchObject({ data: { queue: [{ id: 'trip' }] } });
  s.inventory.finish([]); s.inventory.begin(13);
  expect(() => s.service.step(13,[{ name: 'courier',work: true }])).not.toThrow();
  expect(s.inventory.pending()[0]).toMatchObject({ kind: 'withdraw',amount: 15 });
});
