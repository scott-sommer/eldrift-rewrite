import { expect,test } from 'vitest';
import { paidMiningBankingFixture } from '../../fixtures/paid-mining-banking';
import { resumeHomeHaulingWorld } from '../../../src/app/remotes/startup/hauling-state/world/driver';
import { createLogisticsRequests } from '../../../src/features/logistics/request-store';
import { createTransferJournal } from '../../../src/features/logistics/transfer-journal';

test('real banking interrupts remote work, transfers physical cargo and settles once after JSON resume',() => {
  const f = paidMiningBankingFixture(),first = f.world.step(f.frame(10));
  expect(first.effects).toMatchObject([{ kind: 'transfer',source: 'miner-id',target: 'bank',amount: 20 }]); expect(first.deliveries).toEqual([]);
  const cp = JSON.parse(JSON.stringify(f.world.checkpoint())),fresh = paidMiningBankingFixture(),resumed = resumeHomeHaulingWorld(cp,fresh.configure);
  for (let tick = 11; tick <= 13; tick++) expect(resumed.step(fresh.frame(tick))).toEqual(f.world.step(f.frame(tick)));
  expect(resumed.checkpoint()).toEqual(f.world.checkpoint());
  expect(f.world.snapshot().inventories.find(store => store.id === 'bank')!.energy).toBe(20);
  expect(createTransferJournal(f.shared.state,'miner-id').peek()).toMatchObject({ acknowledged: true,result: { status: 'observed',amount: 20 } });
});

test('partial banking retains cargo and selects another actual sink after the first is full',() => {
  const f = paidMiningBankingFixture({ capacity: 10,alternate: true });
  expect(f.world.step(f.frame(10)).effects).toMatchObject([{ target: 'bank',amount: 10 }]);
  f.world.step(f.frame(11)); expect(f.world.step(f.frame(12)).effects).toMatchObject([{ target: 'spare',amount: 10 }]); f.world.step(f.frame(13));
  expect(Object.fromEntries(f.world.snapshot().inventories.filter(store => ['bank','spare','miner-id'].includes(store.id)).map(store => [store.id,store.energy]))).toEqual({ bank: 10,spare: 10,'miner-id': 0 });
});

test('banking respects outside capacity liabilities and route/home refusal before interruption',() => {
  const claimed = paidMiningBankingFixture({ capacity: 20,claimed: 15 });
  expect(claimed.world.step(claimed.frame(10)).effects).toMatchObject([{ amount: 5 }]);
  expect(claimed.shared.quantities.list(10).find(claim => claim.id === 'outside')!.allocations[0]!.amount).toBe(15);
  for (const denied of ['home','route']) {
    const f = paidMiningBankingFixture(); if (denied === 'home') f.homeReady(false); else f.routeReady(false);
    const before = JSON.stringify(f.world.checkpoint().state); expect(f.world.step(f.frame(10)).effects).toEqual([]); expect(JSON.stringify(f.world.checkpoint().state)).toBe(before);
  }
});

test('home loss settles the prior effect, cancels bank work and never transfers or credits twice',() => {
  const f = paidMiningBankingFixture(); f.world.step(f.frame(10)); f.homeReady(false);
  expect(f.world.step(f.frame(11)).effects).toEqual([]); expect(createLogisticsRequests(f.shared.state,'W0N1').pending(11)).toEqual([]);
  expect(f.shared.state.read('tasks/miner')).toMatchObject({ data: { queue: [] } });
  expect(f.world.snapshot().inventories.find(store => store.id === 'bank')!.energy).toBe(20);
});

test('banking continuation refuses a missing physical effect, missing journal or changed request binding',() => {
  const f = paidMiningBankingFixture(); f.world.step(f.frame(10)); const original = f.world.checkpoint();
  const effect = structuredClone(original); effect.inventory.effects = []; expect(() => resumeHomeHaulingWorld(effect,f.configure)).toThrow('pending effect');
  const journal = structuredClone(original); journal.state = journal.state.filter(record => record.key !== 'logistics-attempts/miner-id'); expect(() => resumeHomeHaulingWorld(journal,f.configure)).toThrow('pending journal');
  const wrong = structuredClone(original),record = wrong.state.find(record => record.key === 'logistics-attempts/miner-id')!;
  (record.value.data as { attempt: { requestKey: string } }).attempt.requestKey = 'other'; expect(() => resumeHomeHaulingWorld(wrong,f.configure)).toThrow('request binding');
});

test('a skipped confirmation window resumes as one archived uncertainty, preserving physical stock without a receipt',() => {
  const f = paidMiningBankingFixture(); f.world.step(f.frame(10));
  const skipped = f.frame(11); skipped.operations = [{ kind: 'settle' }]; f.world.step(skipped);
  const fresh = paidMiningBankingFixture(),resumed = resumeHomeHaulingWorld(JSON.parse(JSON.stringify(f.world.checkpoint())),fresh.configure);
  for (let tick = 12; tick <= 13; tick++) expect(resumed.step(fresh.frame(tick))).toEqual(f.world.step(f.frame(tick)));
  expect(resumed.checkpoint()).toEqual(f.world.checkpoint());
  expect(f.shared.state.read('logistics-uncertainty/miner-id')).toMatchObject({ data: { discarded: 0,entries: [{ attempt: { amount: 20 },cargo: 0,tick: 12 }] } });
  expect(f.world.snapshot().inventories.find(store => store.id === 'bank')!.energy).toBe(20);
  const records = f.shared.state.read('logistics-requests/W0N1') as { data: { records: { receipts: unknown[]; cancelled: boolean }[] } };
  expect(records.data.records).toMatchObject([{ cancelled: true,receipts: [] }]);
});
