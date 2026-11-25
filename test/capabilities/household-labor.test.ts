import { expect, test } from 'vitest';
import { createHouseholdLabor } from '../../src/capabilities/economy/startup/household/labor/timeline';
import type { HouseholdLaborJob, HouseholdLaborPorts } from '../../src/capabilities/economy/startup/household/labor/model';
const job: HouseholdLaborJob = { id: 'work',request: 'worker',kind: 'upgrade',pickupAt: 9,outboundTicks: 2,workTicks: 2,returnTicks: 1,energy: 10 };
function fixture(jobs = [job], overrides: Partial<HouseholdLaborPorts> = {}, horizon = 100) {
  let endpoint = 100,spent = 0,lost = 0,tick = -1;
  const calls: { tick: number; kind: string; energy: number }[] = [];
  const ports: HouseholdLaborPorts = {
    worker: request => ({ birth: { request,spawn: 'spawn',startAt: 0,activeAt: 9,cost: 200 },body: ['work','carry','move'] }),
    withdraw(maximum) { const energy = Math.min(maximum,endpoint); endpoint -= energy; calls.push({ tick,kind: 'pickup',energy }); return energy; },
    consume(maximum) { spent += maximum; calls.push({ tick,kind: 'work',energy: maximum }); return maximum; },
    deposit(maximum) { endpoint += maximum; calls.push({ tick,kind: 'return',energy: maximum }); return maximum; },
    lose(energy) { lost += energy; },...overrides,
  };
  const labor = createHouseholdLabor({ horizon,jobs },ports);
  return { labor,calls,advance(through: number) { while (tick < through) labor.step(++tick); },stock: () => ({ endpoint,spent,lost }) };
}
test.each([['upgrade',2],['repair',2],['build',10]] as const)('paid %s work consumes carried stock at the pinned unboosted rate and returns leftovers', (kind,expected) => {
  const f = fixture([{ ...job,kind }]); f.advance(11); expect(f.stock()).toEqual({ endpoint: 90,spent: 0,lost: 0 });
  f.advance(20); const result = f.labor.result().jobs[0]!;
  expect(result).toMatchObject({ phase: 'complete',picked: 10,spent: expected,returned: 10-expected,cargo: 0,lost: 0 });
  expect(f.stock()).toEqual({ endpoint: 100-expected,spent: expected,lost: 0 });
  expect(f.calls.filter(call => call.kind === 'work').map(call => call.tick)).toEqual([12,13]);
});
test('unpaid or inactive workers cannot withdraw and overlapping work does not double-book a body',() => {
  const absent = fixture([job],{ worker: () => undefined }); absent.advance(20); expect(absent.calls).toEqual([]);
  const early = fixture([{ ...job,pickupAt: 8 }]); early.advance(20); expect(early.calls).toEqual([]);
  const f = fixture([job,{ ...job,id: 'overlap',pickupAt: 10 },{ ...job,id: 'same-return',pickupAt: 15 },{ ...job,id: 'after-return',pickupAt: 16 }]);
  f.advance(30); expect(f.labor.result().jobs.map(item => item.phase)).toEqual(['complete','missed','missed','complete']);
});
test('rejected work retains cargo and a capacity-limited return retries without consuming it',() => {
  let deposited = 0; const f = fixture([job],{ consume: () => 0,deposit: maximum => { const amount = Math.min(2,maximum); deposited += amount; return amount; } });
  f.advance(15); expect(f.labor.result().jobs[0]).toMatchObject({ phase: 'returning',cargo: 8,spent: 0,returned: 2 });
  f.advance(19); expect(deposited).toBe(10); expect(f.labor.result().jobs[0]).toMatchObject({ phase: 'complete',cargo: 0,picked: 10,spent: 0,returned: 10 });
});
test('TTL expires before work settlement and accounts for actual carried loss',() => {
  const f = fixture([{ ...job,pickupAt: 610,outboundTicks: 1 }],{ worker: request => ({ birth: { request,spawn: 'spawn',startAt: 0,activeAt: 12,cost: 800 },body: ['claim','work','carry','move'] }) },620);
  f.advance(620); expect(f.stock()).toEqual({ endpoint: 90,spent: 0,lost: 10 });
  expect(f.labor.result().jobs[0]).toMatchObject({ phase: 'expired',doneAt: 611,picked: 10,spent: 0,cargo: 0,lost: 10 });
});
test('invalid paid births, port effects and frame order refuse; results and inputs are detached',() => {
  const jobs = [{ ...job }], f = fixture(jobs); jobs[0]!.energy = 1; expect(() => f.labor.step(1)).toThrow('frame order');
  f.advance(9); const result = f.labor.result(); result.jobs[0]!.cargo = 999; expect(f.labor.result().jobs[0]!.cargo).toBe(10);
  const invalid = fixture([job],{ worker: request => ({ birth: { request,spawn: 'spawn',startAt: 0,activeAt: 9,cost: 0 },body: ['work','carry','move'] }) });
  expect(() => invalid.advance(9)).toThrow('paid household');
  const badEffect = fixture([job],{ withdraw: maximum => maximum+1 }); expect(() => badEffect.advance(9)).toThrow('effect');
});
