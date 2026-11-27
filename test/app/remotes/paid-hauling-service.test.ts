import { createTransitPlan,initialTransitState } from '../../../src/capabilities/movement/transit/plan';
import { advanceTransitFrame } from '../../../src/capabilities/movement/transit/frame';
import { expect, test, vi } from 'vitest';
import { paidHaulingStateFixture } from '../../fixtures/paid-hauling-state';
import { createPaidHaulingForecastState } from '../../../src/app/remotes/startup/hauling-state/seed';
import { createPaidHaulingForecastService } from '../../../src/app/remotes/startup/hauling-state/service';
import type { PaidHaulingAdmission } from '../../../src/app/remotes/startup/hauling-state/service';
import { createLogisticsRequests } from '../../../src/features/logistics/request-store';
import { createQuantityReservations } from '../../../src/persistence/quantities/store';
import { createTransferJournal } from '../../../src/features/logistics/transfer-journal';
import { logisticsPool } from '../../../src/capabilities/logistics/request';
import { resolvePaidCourierOpening } from '../../../src/app/remotes/startup/motion-observation/opening';
function fixture(f = paidHaulingStateFixture()) {
  const seed = createPaidHaulingForecastState('W0N1',11,[f.courier],f.claims);
  let tick = 11, sourceStock = 100, sinkFree = 100, allowed = true;
  const execute = vi.fn(() => ({ status: 'running' as const }));
  const candidate = (): PaidHaulingAdmission => ({ request: { ...f.request,id: 'trip-'+tick,quantity: 100 },phase: 'collect',maximum: 100,
    available: { sourceStock,sinkFree,sinkPool: logisticsPool('capacity','bank'),minimumCollection: 30 } });
  const recruit = vi.fn(candidate), refused = vi.fn(), prepare = vi.fn(() => true);
  const service = createPaidHaulingForecastService(seed,{
    view: worker => ({ tick,cargo: worker.opening.observed.energy,freeCargo: 100-worker.opening.observed.energy,sourceStock,sinkFree,sinkPool: logisticsPool('capacity','bank') }),
    execution: () => ({ execute }),
    observe: worker => ({ tick,cargo: worker.opening.observed.energy,events: [] }),
    recruit,refused,prepare,authorized: () => allowed,
  });
  return { f,seed,service,execute,recruit,refused,prepare,at(frame: number) { tick = frame; },stock(value: number) { sourceStock = value; },capacity(value: number) { sinkFree = value; },deny() { allowed = false; },
    step(work = true) { return service.step(tick,[{ name: 'courier',work }]); } };
}

test('completed work cannot recruit again until the next frame; admission is clipped and respects the new-trip batch', () => {
  const s = fixture(); expect(s.step()).toMatchObject([{ status: 'executed',outcome: { status: 'done' } }]);
  expect(s.recruit).not.toHaveBeenCalled();
  s.at(12); s.stock(25); expect(s.step()).toEqual([{ name: 'courier',status: 'refused' }]);
  expect(s.refused).toHaveBeenCalledOnce(); expect(s.execute).not.toHaveBeenCalled();
  s.at(13); s.stock(50); expect(s.step()[0]!.status).toBe('executed');
  expect(s.execute).toHaveBeenCalledWith(expect.objectContaining({ quantity: 50 }),'collect',50,expect.any(String),expect.any(String));
  expect(createLogisticsRequests(s.seed.state,'W0N1').findPending('owner','trip-13',13)?.quantity).toBe(50);
});

test('outside capacity obligations prevent productive movement until a booking can renew', () => {
  const s = fixture(paidHaulingStateFixture('transfer',30,100)); s.capacity(10);
  const origin = { room: 'W0N1',x: 10,y: 25 };
  const plan = createTransitPlan({ unit: 'native',owner: 'trip',priority: 0,origin,path: [{ ...origin,x: 11 }],weight: 1,recovery: 2 });
  let states = [initialTransitState(plan,11)]; const requested: string[] = [];
  s.execute.mockImplementation(() => { requested.push('native'); return { status: 'running' }; });
  const physical = { legal: () => true,terrain: () => 2 as const };
  expect(s.step()[0]!.status).toBe('executed'); expect(s.execute).not.toHaveBeenCalled();
  states = advanceTransitFrame([plan],states,11,[],physical,requested).states; expect(states[0]!.position).toEqual(origin);
  s.at(12); s.capacity(100); s.step();
  states = advanceTransitFrame([plan],states,12,[],physical,requested).states; expect(states[0]!.position.x).toBe(11);
  expect(s.execute).toHaveBeenCalledWith(expect.objectContaining({ quantity: 50 }),'deliver',30,expect.any(String),expect.any(String));
  expect(s.recruit).not.toHaveBeenCalled();
});

test('settlement precedes a deferred execution visit and task expiry; no actor is implicitly visited', () => {
  const s = fixture(); expect(s.step(false)).toEqual([{ name: 'courier',status: 'deferred' }]);
  expect(createTransferJournal(s.seed.state,'native').read().acknowledged).toBe(true);
  expect(createQuantityReservations(s.seed.state).list(11)).toEqual([s.f.claims[1]]);
  s.at(12); expect(s.service.step(12,[])).toEqual([]); expect(s.execute).not.toHaveBeenCalled();
  const f = paidHaulingStateFixture(); f.opening.observed.task!.record.expiresAt = 11; f.opening.observed.task!.expiresAt = 11;
  const expired = fixture(f); expect(expired.step()).toMatchObject([{ outcome: { status: 'failed',reason: 'expired' } }]);
  expect(createTransferJournal(expired.seed.state,'native').read().acknowledged).toBe(true);
  expect(expired.recruit).not.toHaveBeenCalled();
});

test('explicit actor order shares stock and sink reservations across new requests', () => {
  const f = paidHaulingStateFixture();
  function idle(name: string) {
    const observed = { ...f.opening.observed,name,unit: name,stage: 'idle' as const,energy: 0 }; delete observed.task; delete observed.journal;
    const result = resolvePaidCourierOpening(observed); if (result.status !== 'ready') throw new Error('Invalid idle fixture');
    return { source: name,room: 'E0N1',opening: result.opening };
  }
  const seed = createPaidHaulingForecastState('W0N1',11,[idle('a'),idle('b')],[]), allocations: [string,number][] = [];
  const available = { sourceStock: 80,sinkFree: 100,sinkPool: logisticsPool('capacity','bank') };
  const service = createPaidHaulingForecastService(seed,{
    view: () => ({ ...available,tick: 11,cargo: 0,freeCargo: 50 }),observe: () => ({ tick: 11,cargo: 0,events: [] }),
    execution: worker => ({ execute: (_request,_phase,amount) => { allocations.push([worker.name,amount]); return { status: 'running' }; } }),
    prepare: () => true,authorized: () => true,refused: () => { throw new Error('Unexpected refusal'); },
    recruit: worker => ({ request: { ...f.request,id: worker.name },phase: 'collect',maximum: 50,available }),
  });
  service.step(11,[{ name: 'b',work: true },{ name: 'a',work: true }]);
  expect(allocations).toEqual([['b',50],['a',30]]);
});

test('duplicate/replayed visits refuse before writes, while authority failure invalidates the forecast', () => {
  const s = fixture(),before = JSON.stringify(s.seed.state.read('tasks/courier'));
  expect(() => s.service.step(11,[{ name: 'courier',work: true },{ name: 'courier',work: true }])).toThrow('Duplicate');
  expect(JSON.stringify(s.seed.state.read('tasks/courier'))).toBe(before);
  s.deny(); expect(() => s.step()).toThrow('authority invalidated');
  s.at(12); expect(() => s.step()).toThrow('Cannot resume failed');
  const clean = fixture(); clean.step(); expect(() => clean.step()).toThrow('Nonconsecutive');
});

test('physical observation clock mismatch invalidates service before another action can be forecast', () => {
  const s = fixture(paidHaulingStateFixture('transfer',30,100)); s.at(12);
  expect(() => s.service.step(11,[{ name: 'courier',work: true }])).toThrow('observation frame mismatch');
  expect(s.execute).not.toHaveBeenCalled();
  expect(() => s.service.step(12,[])).toThrow('Cannot resume failed');
});

test('an unseen-source approach retains assigned work instead of treating unavailable stock as empty', () => {
  const s = fixture(paidHaulingStateFixture('transfer',0,100)); s.stock(0); s.prepare.mockReturnValue(false);
  expect(s.step()).toEqual([{ name: 'courier',status: 'preparing' }]);
  expect(s.execute).not.toHaveBeenCalled(); expect(s.recruit).not.toHaveBeenCalled();
  expect(s.seed.state.read('tasks/courier')).toMatchObject({ data: { queue: [{ id: 'trip' }] } });
  s.at(12); s.prepare.mockReturnValue(true);
  expect(s.step()).toMatchObject([{ outcome: { status: 'done' } }]);
  expect(s.recruit).not.toHaveBeenCalled();
});
